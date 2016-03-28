(ns pando.site)

(defn make-site [site-name fundamental]
  {:name site-name
   :root fundamental
   :rooms {}})

(defn room-exists? [site roomname]
  (boolean (get-in site [:rooms roomname])))

(defn get-room [site roomname]
  (get-in site [:rooms roomname]))

(defn add-room! [{rooms :rooms :as site} room]
  (assoc-in site [:rooms (:name room)] room))
