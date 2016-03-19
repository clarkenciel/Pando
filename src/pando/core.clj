;;; This is a very good example for what I'm trying to do
;;; Should try for a mock-up tomorrow

(ns pando.core
  (:use
   (ring.middleware resource file-info)
   [chat.templates])
  (:require
    [compojure.core :as compojure :refer [GET POST]]
    [ring.middleware.params :as params]
    [ring.util.response :as response]
    [compojure.route :as route]
    [aleph.http :as http]
    [byte-streams :as bs]
    [manifold.stream :as s]
    [manifold.deferred :as d]
    [manifold.bus :as bus]
    [clojure.core.async :as a]))

;; event bus, usable with publish! and subscribe
(def chatrooms (bus/event-bus))

(defn chat-handler [{:keys [params] :as req}]
  (println "chat-hanlder:" req)
  (d/let-flow [conn (d/catch
                        (http/websocket-connection req)
                        (fn [_] nil))]
    (if-not conn
      non-websocket-request
      (d/let-flow [room (:room params)
                   name (s/take! conn)]
        ;; create a stream that consumes all messages from
        ;; the room and connect it to the websocket connection
        (s/connect (bus/subscribe chatrooms room) conn)
        
        ;; apply the publish! callback to the buffered stream
        ;; containing strings with messages. I.e, consume the stream
        ;; by publishing its messages to the room in chatrooms
        (s/consume #(bus/publish! chatrooms room %)
                   (->> conn
                        (s/map #(str name ": " %))
                        (s/buffer 100)))))))

;; joining
(def users (atom {}))
(def error-log (atom []))

(defn push-errors! [& es]
  (swap! error-log (fn [eq] (concat eq es))))

(defn flush-errors! []
  (let [out @error-log]
    (swap! error-log (fn [_] []))
    (when (< 0 (count out))
      out)))

(def join-form
  "<form action='/join' method='post'>
    <input type='text' name='name' value='name'/>
    <input type='text' name='room' value='room'/>
    <input type='submit' value='enter'/>
   </form>")

(defn page [& contents]
  (clojure.string/join
   ""
   ((comp concat flatten)
    ["<!doctype html><html><head></head><body>"
     contents
     "</body></html>"])))

(defn errors [& es]
  (map #(format "<p>%s</p></br>" %) (flatten es)))

(defn join-handler [{:keys [params]}]
  (let [room (get params "room")
        name (get params "name")]
    (cond
      (or (>= 0 (count name))
          (>= 0 (count room)))
      (do (push-errors! "Please enter both a name and room")
          (response/redirect "/"))

      (get-in @users [room name])
      (do (push-errors! "That name is already taken for that room")
          (response/redirect "/"))

      :else
      (response/redirect (str "/chat/" room))))) ; work this out

(defn home-handler [{:keys [params] :as req}]
  {:status 200
   :headers {"content-type" "text/html" }
   :body (page join-form
               (errors (or (flush-errors!) "")))})

(def handler
  (params/wrap-params
   (compojure/routes
    (GET "/:id" [id] (str id))
    (GET "/" [] home-handler)
    
    (GET "/echo" [] echo-handler)
    (GET "/chat/:room" [room :as r] chat-handler)
    (POST "/join" [] join-handler)
    (route/not-found "No such page."))))


(comment

  (def s (http/start-server handler {:port 10001}))
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
