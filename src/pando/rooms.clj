(ns pando.rooms)

(defn get-user [{users :users} username]
  (some #{username} users))

(defn user-exists? [room username]
  (boolean (get-user room username)))

(defn add-user [{users :users :as room} username]
  (assoc room :users (conj users username)))

(defn add-word [{words :words :as room} word]
  (assoc-in room [:words words] (+ 1 (get words word 0))))

(defn sum-words [words]
  (apply + (vals words)))

(defn word-percentage [sum word-count]
  (double (/ word-count sum)))

(defn word-percentages [{words :words}]
  (let [total (sum-words words)]
    (map #(word-percentage total %) words)))

(defn make-room [room-name fundamental & user-names]
  {:name room-name
   :users (set user-names)
   :root fundamental
   :words {}})
