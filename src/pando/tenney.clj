(ns pando.tenney)

;; TENNEY CRYSTALZZZ
;; pitches are dealt with as n-dimensional coordinates in a crystal structure
;; that represents the o-tonal space of a fundamental

(defn- stepwise-per-dimension
  "Generate all possible new values for each dimension in a point,
  assuming stepwise motion. E.g. [0 1] -> [(-1 0 1) (0 1 2)]"
  [point]
  (mapv (fn [c] (map #(+ c %) [-1 0 1])) point))

(defn- stepwise-per-point
  "Generate all possible new positions for a 2D point,
  assuming stepwise motion."
  [point]
  (let [[xs ys] (stepwise-per-dimension point)]
    (for [x xs y ys] [x y])))

(defn- manhattan-distances
  "Find the manhattan/taxi distance between each point in to-coll
  and each point in from-coll."
  [from-coll to-coll]
  (for [start from-coll
        end   to-coll]
    (apply + (map - end start))))

(defn- total-m-distances
  "Find the total manhattan/taxi distance between each point in
  to-coll and all points in from-coll"
  [from-coll to-coll]
  (->> (manhattan-distances from-coll to-coll)
       (partition-all (count to-coll))
       (map #(apply + %))))

(defn- next-tenney-layer
  "Generate a layer of coordinates according to Tenney's algorithm.
  NB: ASSUMES 2 DIMENSIONS FOR NOW."
  [current-crystal]
  (->> current-crystal
       (map stepwise-per-point)
       (filter #(some (set %) current-crystal))           ; no pre-existing points
       (filter (fn [pt] (every? #(= % (first pt)) pt))))) ; no identity, or diagonals

(defn next-coord [fundamental used-pitches]
  (if-not (first used-pitches) ; if the list is empty
    fundamental
    (let [layer (next-tenney-layer used-pitches)]
      (->> layer
           (total-m-distances used-pitches)
           (zipmap layer)
           (sort-by second)
           first     ; get closest
           first)))) ; get coord

(defn coord->freq
  "Convert a coordinate in a Tenney Crystal into a frequency,
  given a fundamental and set of 'dimensions,' which represent
  partials over the fundamental."
  [fundamental dimensions coord]
  (let [rat (reduce (fn [acc [dim cval]] (* acc (Math/pow dim cval)))
                       1
                       (zipmap dimensions coord))]
    (Math/abs (* fundamental rat))))
