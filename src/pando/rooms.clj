(ns pando.rooms
  (:require [pando.tenney :as tenney]))

;; this is moving toward a recursive site, which is conceptually elegant
;; TODO: figure out how to make this actually recursive??
(defn make-room [room-name fundamental dimensions]
  {:room-name room-name
   :root fundamental
   :users {} ; {username [coord]}
   :words {}
   :dimensions dimensions})

(defn get-user [{users :users} username]
  (when-let [coord (get users username)]
    {:user-name username :coord (get users username)}))

(defn user-exists? [{users :users} username]
  (contains? users username))

(defn get-coord [{users :users} username]
  (get users username))

(defn get-coords [{users :users}]
  (vals users))

(defn get-usernames [{users :users}]
  (keys users))

(defn add-user [{users :users :as room} username]
  (let [new-coord (tenney/memo-next-coord (vals users))]
    (assoc-in room [:users username] new-coord)))

(defn remove-user [{users :users :as room} username]
  (assoc room :users (dissoc users username)))

(remove-user {:users {"blah" [0 0] "blah2" [-1 0]}} "blah2")

(defn add-word [{words :words :as room} word]
  (assoc-in room [:words words] (+ 1 (get words word 0))))

(defn sum-words [words]
  (apply + (vals words)))

(defn word-percentage [sum word-count]
  (double (/ word-count sum)))

(defn word-percentages [{words :words}]
  (let [total (sum-words words)]
    (map #(word-percentage total %) words)))

