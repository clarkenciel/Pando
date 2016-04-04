(ns pando.core
  (:require
   [compojure.core :as compojure
    :refer [DELETE PUT GET POST context]]
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
(def site (atom (site/make-site "Pando" (* 4 49.00) [2 5]))) ; tune to G1
(def chatrooms (bus/event-bus))

;;; VALIDATION

(defn is-observer? [user-name]
  (= (clojure.string/lower-case user-name)
     "observer"))

(defn invalid-signup [room-name user-name]
  (or (>= 0 (count user-name))
      (>= 0 (count room-name))))

(defn authorized? [room-name user-name]
  (or (is-observer? user-name)
      (rooms/user-exists?
       (site/get-room @site room-name)
       user-name)))

;;; RESPONSES

(defn html-success-response [body]
  {:status 200
   :headers {"content-type" "text/html"}
   :body body})

(defn json-body [body]
  (chesh/generate-string body))

(def json-non-websocket-response
  {:status 400
   :headers {"content-type" "application/json"}
   :body (json-body {:message "Expected a websocket request."})})

(defn json-success-response [body]
  {:status 200
   :headers {"content-type" "application/json"}
   :body (json-body body)})

(defn json-no-permission-response [body]
  {:status 403
   :headers {"content-type" "application/json"}
   :body (json-body body)})

(defn json-bad-request [body]
  {:status 400
   :headers {"content-type" "application/json"}
   :body (json-body body)})

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

(defn shift-room! [room-name freq]
  (swap! site #(site/modify-room
                % room-name
                (partial rooms/shift-room freq))))

(defn pack-room-shift! [user-name room-name message]
  (let [m (chesh/decode message)
        r (site/get-room (shift-room! room-name (get m "frequency"))
                         room-name)]
    (chesh/generate-string
     {"userName" user-name
      "message" (get m "message")
      "newRoot" (:root r)})))

(defn filter-empty-vals [params]
  (select-keys
   params
   (keep (fn [[k v]]
           (when (not= v "") k))
         params)))

;;; HANDLERS

(defn create-room-and-join-handler [{:keys [body]}]
  (let [ps (filter-empty-vals body)
        room-name (or (get ps "new-room-name")
                      (get ps "room-name"))
        user-name (get ps "user-name")]
    
    (cond
      ;; when joining, make sure we have a target room and user name
      (invalid-signup room-name user-name)
      (json-bad-request
       {:message "Please provide both a name and room."})

      ;; when joining, make sure we don't duplicate a user
      (rooms/user-exists? (site/get-room @site room-name) user-name)
      (json-no-permission-response
       {:message (str user-name " is already taken for the room: " room-name ".")})

      :else
      (do (swap! site
                 #(-> % (site/maybe-add-room room-name)
                      (site/maybe-add-user room-name user-name)))
          (json-success-response
           {:loggedIn true
            :userName user-name
            :roomName room-name})))))

;; this handler is only fired on the first use of the
;; /add_message route, after the initial websocket connection
;; is made, we only care about the code in the s/map expression
;; because from then on we use aleph to treat the websocket stream
;; as a simple list (SO COOL)
(defn connect-handler [{:keys [session] :as req}]
  (d/let-flow [conn (d/catch
                        (http/websocket-connection req)
                        (fn [_] nil))]
    (if-not conn
      #'json-non-websocket-response
      (d/let-flow [room-name (:room-name session)
                   user-name (:user-name session)]
        (s/connect (bus/subscribe chatrooms room-name) conn)
        (s/consume
         #(bus/publish! chatrooms room-name %)
         (->> conn
              (s/map (partial pack-room-shift! user-name room-name))
              (s/buffer 100)))))))

(defn remove-user-handler [{{:keys [user-name room-name]} :session}]
  (do
    (remove-user! room-name user-name)
    (when (>= 0 (count (:users (site/get-room @site room-name))))
      (remove-room! room-name))
    (assoc (response/redirect "/")
           :session nil)))

(defn home-handler [{:keys [params session] :as req}]
  (html-success-response (slurp "resources/app/index.html")))

(defn list-rooms-handler [req]
  (let [rooms (site/list-rooms-info @site)]
    (json-success-response
     {:roomCount (count rooms)
      :rooms rooms})))

(defn list-users-handler [room-name]
  (if-not (site/room-exists? @site room-name)
    (json-bad-request
     {:message (str room-name " does not exist!")})
    (let [usernames (rooms/list-usernames
                     (site/get-room @site room-name))]
      (json-success-response
       {:userCount (count usernames)
        :users usernames}))))

;;; ROUTES

(def room-routes
  (context "/api/rooms" []
           (GET "/list" req (list-rooms-handler req))
           (GET "/users/:room-name" [room-name]
                (list-users-handler room-name))
           (POST "/join" req
                 (create-room-and-join-handler req))
           (POST "/connect" req
                 (connect-handler req))
           (DELETE "/quit/:room-name/:user-name" [room-name user-name]
                   (remove-user-handler room-name user-name))))

(def routes
  (compojure/routes
   room-routes
   (GET "*" [] home-handler)))

(def app-routes
  (-> routes
      (resource/wrap-resource "app")
      (content/wrap-content-type)
      (params/wrap-params)
      (json/wrap-json-body)
      (session/wrap-session)))


(comment

  (def s (http/start-server #'app-routes {:port 10001}))
  (.close s)
  
  )
