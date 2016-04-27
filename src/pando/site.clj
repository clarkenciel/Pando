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

(defn list-rooms-info [site]
  (map (fn [[_ r]]
         {:roomName (:room-name r)
          :userCount (rooms/user-count r)})
       (:rooms site)))

(defn add-room
  [{:keys [used-coords root dimensions] :as site} room-name]
  (let [new-coord (tenney/next-coord used-coords)
        new-room  (rooms/make-room
                   room-name
                   (tenney/coord->freq root dimensions new-coord)
                   dimensions)]
    (-> site
        (assoc-in [:rooms room-name] new-room)
        (assoc :used-coords (conj used-coords new-coord)))))

(defn remove-room [{rooms :rooms :as site} room-name]
  (assoc site :rooms (dissoc rooms room-name)))

(defn modify-room [site room-name f]
  (let [room (get-room site room-name)]
    (assoc-in site [:rooms room-name] (f room))))

(defn maybe-add-room [site room-name]
  (if (room-exists? site room-name)
    site
    (add-room site room-name)))

(defn update-user-ping [site room-name user-name]
  (if-let [user (get-in site [:rooms room-name :users user-name])]
    (assoc-in site [:rooms room-name :users user-name] (rooms/update-ping user))
    site))
