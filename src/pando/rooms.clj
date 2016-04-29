(ns pando.rooms
  (:require [pando.tenney :as tenney]
            [clj-time.core :as t]))

;; this is moving toward a recursive site, which is conceptually elegant
;; TODO: figure out how to make this actually recursive??
(defn make-room [room-name fundamental dimensions]
  {:room-name room-name
   :root fundamental
   :users {}
   :dimensions dimensions})

(defn get-user [{:keys [users root dimensions]} username]
  (when-let [{coord :coord} (get users username)]
    {:userName username
     :coord coord
     :frequency (tenney/coord->freq root dimensions coord)}))

(defn user-exists? [{users :users} username]
  (contains? users username))

(defn get-coord [{users :users} username]
  (get users username))

(defn get-coords [{users :users}]
  (vals users))

(defn list-users [{:keys users root dimensions}]
  (let [convert (partial tenney/coord->freq root dimensions)]
    (map
     (fn [[uname {coord :coord}]]
       {:userName uname :coord coord :frequency (convert coord)})
     users)))

(defn user-count [{users :users}]
  (reduce (fn [acc _] (inc acc)) 0 users))

(defn upsert-user [{users :users :as room} username]
  (let [new-coord (tenney/next-coord (map :coord (vals users)))]
    (assoc-in room [:users username] {:coord new-coord
                                      :last-ping (clj-time.core/now)})))

(defn update-ping [user]
  (assoc user :last-ping (clj-time.core/now)))

(defn remove-user [{users :users :as room} username]
  (assoc room :users (dissoc users username)))

(defn shift-room [frequency {root :root :as room}]
  (assoc room :root (cond
                      (> root frequency) (- root (* 0.1 (- root frequency)))
                      (> frequency root) (+ root (* 0.1 (- frequency root)))
                      :else root)))
