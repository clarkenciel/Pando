(ns pando.site
  (:require [pando.tenney :as tenney])
  (:require [pando.rooms :as rooms]))

(defn make-site [site-name fundamental dimensions]
  {:name site-name
   :root fundamental
   :used-coords []
   :rooms {}
   :dimensions dimensions})

(defn room-exists? [site roomname]
  (boolean (get-in site [:rooms roomname])))

(defn get-room [site roomname]
  (get-in site [:rooms roomname]))

(defn add-room
  [{:keys [rooms used-coords root dimensions] :as site} room-name]
  (let [new-coord (tenney/memo-next-coord used-coords)
        new-room  (rooms/make-room room-name
                                   (tenney/coord->freq root dimensions new-coord)
                                   dimensions)]
    (assoc site
           :rooms (assoc rooms room-name new-room)
           :used-coords (conj used-coords new-coord))))

(defn remove-room [{rooms :rooms :as site} room-name]
  (assoc site :rooms (dissoc rooms room-name)))

(defn modify-room [site room-name f]
  (let [room (get-room site room-name)]
    (assoc-in site [:rooms room-name] (f room))))
