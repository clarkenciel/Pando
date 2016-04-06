(ns pando.core
  (:require
   [compojure.core :as compojure
    :refer [DELETE PUT GET POST context]]
   [compojure.route :as route]
   [clj-time.core :as t]
   [ring.middleware.params :as params]
   [ring.middleware.session :as session]
   [ring.middleware.resource :as resource]
   [ring.middleware.file-info :as file-info]
   [ring.middleware.content-type :as content]
   [ring.middleware.json :as json]
   [aleph.http :as http]
   [manifold.stream :as s]
   [manifold.deferred :as d]
   [manifold.bus :as bus] 
   [cheshire.core :as chesh]
   [pando.rooms :as rooms]
   [pando.site :as site]))

;;; SITE
(def site (atom (site/make-site "Pando" (* 4 49.00) [2 5]))) ; tune to G1
(def chatrooms (bus/event-bus))
(def user-kill-queue (atom {}))
(def cookie-lifetime (* 2 3600))

;;; VALIDATION

(defn is-observer? [user-name]
  (= (clojure.string/lower-case user-name)
     "observer"))

(defn invalid-signup [room-name user-name]
  (or (>= 0 (count user-name))
      (>= 0 (count room-name))))

(defn authorized? [{:keys [logged-in room-name user-name]}]
  (if (not (and room-name user-name))
    false
    (or (is-observer? user-name) ; observers don't need to be logged in
        logged-in)))

(defn user-name-available? [site room-name user-name]
  (println "checking availability of" user-name "in" room-name)
  (if-let [timeout (get-in site [:rooms room-name :users user-name :timeout])]
    (t/after? (t/now) timeout)
    true))

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

;;; SITE-LEVEL ROOM AND USER MANIPULATION

(defn remove-user! [room-name user-name]
  (println "removing user:" user-name "from room:" room-name)
  (swap! site
         (fn [s]
           (let [new-s (site/modify-room s room-name #(rooms/remove-user % user-name))]
             (if (>= 0 (rooms/user-count (site/get-room new-s room-name)))
               (site/remove-room new-s room-name)
               new-s)))))

(defn add-room! [room-name]
  (swap! site #(site/add-room % room-name)))

(defn remove-room! [room-name]
  (swap! site #(site/remove-room % room-name)))

(defn shift-room! [room-name freq]
  (swap! site #(site/modify-room
                % room-name
                (partial rooms/shift-room freq))))

(defn pack-room-shift! [user-name room-name message]
  (println user-name room-name message)
  (let [m (chesh/decode message)
        r (site/get-room
           (shift-room! room-name (get m "frequency"))
           room-name)]
    (if r
      (chesh/generate-string (assoc m "newRoot" (:root r)))
      (do (println "no r")
          message))))

(defn create-room-and-auth! [room-name user-name]
  (println "authorizing" user-name "for" room-name)
  (let [resp (json-success-response {:roomName room-name :user user-name})]
    (if (is-observer? user-name)
      ;; don't "log in" an observer
      (assoc resp :session
             {:user-name user-name
              :room-name room-name})
      (do        
        (swap! site
               (fn [s]
                 (-> s
                     (site/maybe-add-room room-name)
                     (site/modify-room
                      room-name
                      #(rooms/upsert-user % user-name (t/seconds cookie-lifetime))))))
        (assoc resp :session
               {:logged-in true
                :user-name user-name
                :room-name room-name})))))

(defn refresh-user! [room-name user-name]
  (swap! site (fn [s]
                (site/modify-room
                 s room-name
                 #(rooms/upsert-user % user-name (t/seconds cookie-lifetime))))))

;; HELPERS

(defn filter-empty-vals [params]
  (select-keys
   params
   (keep (fn [[k v]]
           (when (not= v "") k))
         params)))

(defn with-room [room-name f]
  (if-not (site/room-exists? @site room-name)
    (json-bad-request
     {:message (str room-name " does not exist!")})
    (let [room (site/get-room @site room-name)]
      (f room))))

;;; HANDLERS

(defn auth-handler [{:keys [body session]}]
  (let [ps (filter-empty-vals body)
        room-name (or (get ps "new-room-name")
                      (get ps "room-name"))
        user-name (get ps "user-name")]
    (println "checking authorization of" user-name "for" room-name)
    (cond
      ;; if the user is still logged in
      (authorized? session)
      (do
        (refresh-user! room-name user-name)
        (assoc (json-success-response {:message "Welcome!"}) :session session))
      
      ;; when joining, make sure we have a target room and user name
      (invalid-signup room-name user-name)
      (assoc (json-bad-request
              {:message "Please provide both a name and room."})
             :session nil)

      ;; when joining, make sure we don't duplicate a user
      (not (user-name-available? @site room-name user-name))
      (assoc (json-no-permission-response
              {:message (str user-name " is already taken for the room: " room-name ".")})
             :session nil)

      :else
      (create-room-and-auth! room-name user-name))))

(defn connect-handler [{:keys [session] :as req}]
  (let [room-name (:room-name session)
        user-name (:user-name session)]
    (println "attempting to connect" user-name "to" room-name session)
    (if-not (authorized? session)
      (json-no-permission-response
       {:message "Your session has expired. Please log in again."})      
      (d/let-flow [conn (d/catch (http/websocket-connection req) (fn [_] nil))]
        (if-not conn
          #'json-non-websocket-response      
          (d/let-flow [source (bus/subscribe chatrooms room-name)]
            ;; so: chatrooms bus -> websocket
            (s/connect source conn)
            
            ;; so: websocket -> chatrooms bus
            (s/consume
             #(bus/publish! chatrooms room-name %)
             (s/map (partial pack-room-shift! user-name room-name)
                    (s/throttle 10 conn)))))))))

(defn remove-user-handler [{{:keys [user-name room-name]} :session}]
  (println "deleting:" user-name room-name)
  (do
    (remove-user! room-name user-name)
    (assoc (json-success-response)
           :session nil)))

;; retemplate this page so that we can embed token data to make
;; repeated log in faster
(defn home-handler [{:keys [params session] :as req}]
  (html-success-response (slurp "resources/app/index.html")))

(defn list-rooms-handler [req]
  (let [rooms (site/list-rooms-info @site)]
    (json-success-response
     {:roomCount (count rooms)
      :rooms rooms})))

(defn list-users-handler [room-name]
  (with-room room-name
    (fn [room]
      (let [usernames (rooms/list-usernames room)]
        (json-success-response
         {:userCount (count usernames)
          :users usernames})))))

(defn get-user-info-handler [room-name user-name]
  (with-room room-name
    (fn [room]
      (let [user (rooms/get-user user-name)]
        (json-success-response user)))))

;;; ROUTES

(def room-routes
  (context "/api/rooms" []
           (GET "/list" req (list-rooms-handler req))
           (GET "/info/users/:room-name" [room-name]
                (list-users-handler room-name))
           (GET "/info/:room-name/:user-name" [room-name user-name]
                (get-user-info-handler room-name user-name))                     
           ))

(def routes
  (compojure/routes   
   room-routes
   (POST "/api/authorize" req (auth-handler req))
   (GET "/api/connect" req (connect-handler req))
   (DELETE "/api/quit" req (remove-user-handler req))
   (GET "*" [] home-handler)))

(def app-routes
  (-> routes
      (resource/wrap-resource "app")
      (content/wrap-content-type)
      (params/wrap-params)
      (json/wrap-json-body)
      (session/wrap-session {:cookie-name "Pando"
                             :cookie-attrs
                             {:max-age cookie-lifetime}})))

(comment

  (def s (http/start-server #'app-routes {:port 10001}))
  (.close s)
  
  )
