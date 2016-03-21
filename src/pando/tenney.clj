(ns pando.tenney)

;; TENNEY CRYSTALZZZ
;; pitches are dealt with as n-dimensional coordinates in a crystal structure
;; that represents the o-tonal space of a fundamental

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

(defn manhattan-distance
  [start-pt end-pt]
  (apply + (map #(Math/abs (- %1 %2)) start-pt end-pt)))

(defn manhattan-distances
  "Find the manhattan/taxi distance between each point in to-coll
  and each point in from-coll."
  [from-coll to-coll]
  (for [start from-coll
        end   to-coll]
    (manhattan-distance start end)))

(defn total-m-distances
  "Find the total manhattan/taxi distance between each point in
  to-coll and all points in from-coll"
  [from-coll to-coll]
  (->> (manhattan-distances from-coll to-coll)
       (partition-all (count from-coll))
       (map #(apply + %))))

(defn filter-diagonals [pts]
  (filter (fn [[x & xs]]
            (not (every?
                  #(= (Math/abs %)
                      (Math/abs x))
                  xs)))
          pts))

(defn filter-duplicates [coll pts]
  (filter (fn [pt] (not (some #{pt} coll)))
          pts))

(defn next-tenney-layer
  "Generate a layer of coordinates according to Tenney's algorithm.
  NB: ASSUMES 2 DIMENSIONS FOR NOW."
  [current-crystal]
  (->> current-crystal
       (mapcat stepwise-per-point)
       filter-diagonals
       (filter-duplicates current-crystal)))

(defn next-coord [used-pitches]
  (let [layer (next-tenney-layer used-pitches)]
    (->> layer
         (total-m-distances used-pitches)
         (zipmap layer)
         (sort-by second)
         first    ; get closest
         first))) ; get coord

(def memo-next-coord (memoize next-coord))

(def crystal-iter (iterate #(conj % (next-coord %)) [[0 0]]))

(def memo-crystal-iter (iterate #(conj % (memo-next-coord %)) [[0 0]]))

(defn coord->freq
  "Convert a coordinate in a Tenney Crystal into a frequency,
  given a fundamental and set of 'dimensions,' which represent
  partials over the fundamental."
  [fundamental dimensions coord]
  (let [rat (reduce
             (fn [[dim1 cval1] [dim2 cval2]]
               (* (Math/pow dim1 cval1)
                  (Math/pow dim2 cval2)))
             (zipmap dimensions coord))]
    (Math/abs (* fundamental rat))))
