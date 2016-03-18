(ns aleph.examples.http
  (:require
    [compojure.core :as compojure :refer [GET]]
    [ring.middleware.params :as params]
    [compojure.route :as route]
    [compojure.response :refer [Renderable]]
    [aleph.http :as http]
    [byte-streams :as bs]
    [manifold.stream :as s]
    [manifold.deferred :as d]
    [clojure.core.async :as a]))

;; standard ring response - happens immediately
(defn hello-world-handler
  [req]
  {:status 200
   :headers {"content-type" "text/plain"}
   :body "hello world!"})

;; deferred response - happens after 1 second
;; BUT, allows the thread to be released in the mean time
(defn delayed-hello-world-handler
  [req]
  (d/timeout! ; places a timeout value into a deferred
              ; if the deferred hasn't fired after the given
              ; time period if it hasn't been 'realized'
   (d/deferred)
   1000
   (hello-world-handler seq)))

;; Now, there is a problem here: Compojure will try to immediately
;; render, and therefore derefence the deferrable, which will
;; block the thread, thus rather rendering the goal of the deferrable
;; moot.
;; There are at least two potential solutions:
;; 1. Extende compojure's Renderable protocol to pass the deferred through

(extend-protocol Renderable
  manifold.deferred.Deferred
  (render [d _] d)) ; simply pass deferreds through

;; 2. use core.async's goroutines
(defn delayed-hello-world-handler
  [req]
  (s/take! ; take first val
   (s/->source ; convert to Manifold source
    (a/go ; our goroutine
      ;; a/timeout returns a channel that closes after the given time period
      ;; a/<! draws a value from that channel
      ;; the goroutine will execute asynchronously and
      ;; all visible calls to <!, >!, alt!/alts! will block.
      ;; In this case that means until the timeout occurs nothing will happen
      ;; and then the handler will be evaluated
      (let [_ (a/<! (a/timeout 1000))] 
        (hello-world-handler req))))))

;; Streaming HTTP response
;; Normally this is accomplished using lazy sequences, but Aleph
;; allows us to do it with manifolds and so we don't block

(defn streaming-numbers-handler
  [{:keys [params]}]
  (let [cnt (Integer/parseInt (get params "count" "0"))]
    {:status 200
     :headers {"content-type" "text/plain"}
     :body (let [sent (atom 0)]
             (->> (s/periodically 100 #(str (swap! sent inc) "\n"))
                  ;; applies the transducer (take cnt) to the
                  ;; stream of periodically emitted values produced
                  ;; by s/periodically
                  (s/transform (take cnt))))}))

;; as a lazy sequence the above would look like

(defn streaming-numbers-handler
  [{:keys [params]}]
  (let [cnt (Integer/parseInt (get params "count" "0"))
        body (a/chan)] ; a channel
    (a/go-loop [i 0] ; asynchronouse execution of a loop (go (loop ...))
      (if (> i cnt)
        (a/close! body) ; close the channel if we've filled the count
        (let [_ (a/timeout 100)] ; pause for 100 ms
          (a/>! body (str i "\n")) ; send (str i "\n") to body channel
          (recur (inc i)))))
    ;; return a response that contains the body channel,
    ;; coerced into a manifold. This will update with the
    ;; messages from the above routine
    {:status 200
     :headers {"content-type" "text-play"}
     :body (s/->source body)}))

(def handler
  (params/wrap-params ; gives us access to the :params key of the req map
   (compojure/routes
    (GET "/hello" [] hello-world-handler)
    (GET "/delayed_hello" [] delayed-hello-world-handler)
    (GET "/numbers" [] streaming-numbers-handler)
    (route/not-found "No such page."))))

(def s (http/start-server handler {:port 10000}))

(-> @(http/get "http://localhost:10000/hello") ; yields manifold, must be dereffed
    :body
    bs/to-string) ; => "hello world!"

(-> @(http/get "http://localhost:10000/delayed_hello")
    :body
    bs/to-string) ; => beat "hello world!"

;; chain allows composition of functions over a manifold
;; here, the final result is dereffed
@(d/chain (http/get "http://localhost:10000/delayed_hello")
          :body
          bs/to-string)

;; conver the \n-delimited list of int-strings and convert to list
(->> @(http/get "http://localhost:10000/numbers"
                {:query-params {:count 10}})
     :body
     bs/to-line-seq ; convert to seq of strings
     (map #(Integer/parseInt %))
     doall)

;; the same using chain
@(d/chain
  (http/get "http://localhost:10000/numbers"
            {:query-params {:count 10}
             :raw-stream? true})  ; allow for asynchronous processing
  :body
  ;; both following expressions are async  
  #(s/map bs/to-byte-array %) ; convert array of ByteBufs to stream of byte[]
  #(s/reduce conj [] %)       ; accumulate into vec of bytes
  bs/to-string)               ; convert to string

(.close s)
