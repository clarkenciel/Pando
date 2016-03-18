(ns chat.rooms)

;; the site - fundamental is G3
(def ^:dynamic *site*
  (atom {:fundamental 196.0
         :rooms {}
         :used-pitches []}))

(defn get-room [name]
  (get-in *site* [:rooms name] nil))

(defn get-user-in-room [roomname username]
  (get-in *site* [:rooms roomname username] nil))

(defn room-exists? [roomname]
  (boolean (get-room roomname)))

(defn user-exists? [roomname username]
  (boolean (get-user-in-room roomname username)))

(defn make-room [room-name fundamental & user-names]
  {:users user-names
   :root  fundamental
   :words {}})

(defn add-room! [room-name & user-names]
  (let [new-fund (next-tenney-layer (:fundamental *site*))]
    (do (swap! *site*
               #(assoc % room-name (make-room room-name new-fund user-names)))
        (get-room room-name))))

;; TENNEY CRYSTALZZZ
;; pitches are represented as n-dimensional coordinates

(defn coord->pitch [coord dimensions])

(defn stepwise-per-dimension
  "Generate all possible new values for each dimension in a point,
  assuming stepwise motion. E.g. [0 1] -> [(-1 0 1) (0 1 2)]"
  [point]
  (mapv (fn [c] (map #(+ c %) [-1 0 1])) point))

(defn stepwise-per-point
  "Generate all possible new positions for a 2D point,
  assuming stepwise motion."
  [point]
  (let [[xs ys] (stepwise-per-dimension point)]
    (for [x xs y ys] [x y])))

(defn manhattan-distances
  "Find the manhattan/taxi distance between each point in to-coll
  and each point in from-coll."
  [from-coll to-coll]
  (for [start from-coll
        end   to-coll]
    (apply + (map - end start))))

(defn total-m-distances
  "Find the total manhattan/taxi distance between each point in
  to-coll and all points in from-coll"
  [from-coll to-coll]
  (->> (manhattan-distances from-coll to-coll)
       (partition-all (count to-coll))
       (map #(apply + %))))

(defn next-tenney-layer
  "Generate a layer of coordinates according to Tenney's algorithm.
  NB: ASSUMES 2 DIMENSIONS FOR NOW."
  [current-crystal]
  (map stepwise-per-point current-crystal))

(defn next-coord [fundamental used-pitches]
  (if-not (first used-pitches) ; if the list is empty
    fundamental
    (let [layer (next-tenney-layer used-pitches)]
      (->> layer
           (total-m-distances used-pitches)
           (zipmap layer)
           (sort-by second)
           first))))
