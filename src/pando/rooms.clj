(ns pando.rooms)

(defn get-room [site name]
  (get-in site [:rooms name] nil))

(defn get-user-in-room [site roomname username]
  (get-in site [:rooms roomname username] nil))

(defn room-exists? [site roomname]
  (boolean (get-room site roomname)))

(defn user-exists? [site roomname username]
  (boolean (get-user-in-room site roomname username)))

(defn make-room [room-name fundamental & user-names]
  {:users user-names
   :root  fundamental
   :words {}})

(defn add-room! [site room-name room]
  (get-room (swap! site #(assoc % room-name room))
            room-name))
