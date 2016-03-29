(ns pando.core
  (:require
   [compojure.core :as compojure :refer [GET POST]]
   [compojure.route :as route]
   [ring.middleware.params :as params]
   [ring.middleware.session :as session]
   [ring.middleware.resource :as resource]
   [ring.middleware.file-info :as file-info]
   [ring.middleware.content-type :as content]
   [ring.middleware.json :as json]
   [ring.util.response :as response]   
   [aleph.http :as http]
   [byte-streams :as bs]
   [manifold.stream :as s]
   [manifold.deferred :as d]
   [manifold.bus :as bus]
   [clojure.core.async :as a]
   [cheshire.core :as chesh]
   [pando.templates :as templates]
   [pando.rooms :as rooms]
   [pando.site :as site]))

;;; SITE
(def site (atom (site/make-site "Pando" 49.00 [3 5]))) ; tune to G1
(def chatrooms (bus/event-bus))

;;; VALIDATION

(defn is-observer? [user-name]
  (= (clojure.string/lower-case user-name)
     "observer"))

(defn invalid-signup [room name]
  (or (>= 0 (count name))
      (>= 0 (count room))))

;;; RESPONSES

(def non-websocket-response
  {:status 400
   :headers {"content-type" "application/text"}
   :body "Expected a websocket request."})

(defn success-response [body]
  {:status 200
   :headers {"content-type" "text/html"}
   :body body})

(defn no-permission-response [body]
  {:status 403
   :headers {"content-type" "text/html"}
   :body body})

;;; ERROR QUEUE

(def error-log (atom []))

(defn push-errors! [& es]
  (swap! error-log (fn [eq] (concat eq es))))

(defn flush-errors! []
  (let [out @error-log] 
    (swap! error-log (fn [_] []))
    (when (< 0 (count out))
      out)))

;;; SITE-LEVEL ROOM AND USER MANIPULATION

(defn add-user! [room-name user-name]
  (swap! site
         (fn [s]
           (site/modify-room
            s room-name #(rooms/add-user % user-name)))))

(defn remove-user! [room-name user-name]
  (swap! site
         (fn [s]
           (site/modify-room
            s room-name #(rooms/remove-user % user-name)))))

(defn add-room! [room-name]
  (swap! site #(site/add-room % room-name)))

(defn remove-room! [room-name]
  (swap! site #(site/remove-room % room-name)))

;;; HANDLERS

(defn join-handler [{:keys [params]}]
  (let [ps (select-keys params
                        (keep (fn [[k v]]
                                (when (not= v "") k))
                              params))
        room-name (or (get ps "new-room-name")
                      (get ps "room-name"))
        user-name (get ps "user-name")]
    (cond
      (invalid-signup room-name user-name)
      (do (push-errors! "Please enter both a name and room")
          (response/redirect "/"))

      (rooms/user-exists? (site/get-room @site room-name) user-name)
      (do (push-errors! "That name is already taken for that room")
          (response/redirect "/"))

      :else
      (do
        (when-not (site/room-exists? @site room-name)
          (add-room! room-name))
        (when-not (rooms/user-exists?
                   (site/get-room @site room-name)
                   user-name)
          (add-user! room-name user-name))
        (assoc (response/redirect (str "/chat/" room-name))
               :session {:user-name user-name
                         :room-name room-name})))))

(defn chat-handler [room {{:keys [user-name room-name]} :session}]
  (if-not (or (is-observer? user-name)
              (rooms/user-exists?
               (site/get-room @site room-name)
               user-name))
    (no-permission-response
     "You do not have permission to view this chat")
    
    (let [room (site/get-room @site room-name)
          user (rooms/get-user room user-name)]
      (success-response (if (is-observer? user-name)
                          (templates/page
                           (templates/admin-client room))
                          (templates/page
                           (templates/normal-client room user)))))))

(defn connect-handler [req]
  (let [server (:server-name req)
        port   (:server-port req)]
    (success-response
     (chesh/generate-string
      {:socketAddress (str "ws://" server ":" port "/add_message")}))))

(defn message-handler [{:keys [session] :as req}]
  ;;(println "message-handler")
  ;;(clojure.pprint/pprint req)
  ;; conn is deferred value - this will block until it can be
  ;; computed
  (d/let-flow [conn (d/catch
                        (http/websocket-connection req)
                        (fn [_] nil))]
    (if-not conn
      #'non-websocket-response
      (d/let-flow [room (:room-name session)
                   name (:user-name session)]
        ;; create a stream that consumes all messages from
        ;; the room and connect it to the websocket connection
        (s/connect (bus/subscribe chatrooms room) conn)
        
        ;; apply the publish! callback to the buffered stream
        ;; containing strings with messages. I.e, consume the stream
        ;; by publishing its messages to the room in chatrooms
        (s/consume #(bus/publish! chatrooms room %)
                   (->> conn
                        (s/map #(chesh/generate-string
                                 {"userName" name
                                  "message" (get
                                             (chesh/decode %)
                                             "message")}))
                        (s/buffer 100)))))))

(defn leave-handler [{{:keys [user-name room-name]} :session}]
  (do
    (remove-user! room-name user-name)
    (when (>= 0 (count (:users (site/get-room @site room-name))))
      (remove-room! room-name))
    (assoc (response/redirect "/")
           :session nil)))

(defn home-handler [{:keys [params session] :as req}]
  (let [errors (flush-errors!)
        user-name (:user-name session)
        room-name (:room-name session)]
    (if (and user-name room-name)
      (response/redirect (str "/chat/" room-name))
      (success-response (templates/page
                         (templates/join-form @site)
                         errors)))))

;;; ROUTES

(def routes
  (compojure/routes
   (GET "/" [] home-handler)
   (GET "/chat/:room" [room :as req] (chat-handler room req))
   (POST "/join" [] join-handler)
   (POST "/leave" req (leave-handler req))
   (GET "/add_message" req (message-handler req))
   (POST "/connect" req (connect-handler req))
   (route/not-found "No such page.")))

(def app-routes
  (-> routes
      (resource/wrap-resource "static")
      (content/wrap-content-type)
      (params/wrap-params)
      (json/wrap-json-body)
      (session/wrap-session)))


(comment

  (def s (http/start-server #'app-routes {:port 10001}))
  (.close s)

  ;; putting and reading
  ;; in a web app this would be happening on the client side
  ;; and the socket connection would be served up by the
  ;; server per a request from the client
  (let [conn @(http/websocket-client "ws://localhost:10001/echo")]
    ;; put 10 messages on the server
    (s/put-all! conn
                (->> 10 range (map str)))

    ;; take 10 messages off the server and convert the stream
    ;; into a sequence of strings that we convert to ints
    (->> conn
         (s/transform (take 10))
         s/stream->seq
         (map #(Integer/parseInt %))
         doall))

  ;; two clients that can talk to each other
  (let [conn1 @(http/websocket-client "ws://localhost:10001/chat")
        conn2 @(http/websocket-client "ws://localhost:10001/chat")]
    ;; sign in
    (s/put-all! conn1 ["shoes and ships" "Alice"])
    (s/put-all! conn2 ["shoes and ships" "Bob"])

    (s/put! conn1 "hello")

    (println @(s/take! conn1)) ; => "Alice: hello"
    (s/put! conn2 "hi")

    (println @(s/take! conn2)) ; => "Alice: hello"

    (println @(s/take! conn1)) ; => "Bob: hi!"
    (println @(s/take! conn2)) ; => "Bob: hi!"
    )
  )






