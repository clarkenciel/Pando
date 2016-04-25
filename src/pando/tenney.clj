(ns pando.tenney)

;; TENNEY CRYSTALZZZ
;; pitches are dealt with as n-dimensional coordinates in a crystal structure
;; that represents the o-tonal space of a fundamental

(defn stepwise-per-dimension
  "Generate all possible new values for each dimension in a point,
  assuming stepwise motion. E.g. [0 1] -> [(1 0 -1) (0 1 2)]"
  [point]
  (mapv (juxt identity inc dec) point))

(def memo-stepwise-per-dimension (memoize stepwise-per-dimension))

(defn stepwise-per-point
  "Generate all possible new positions for a 2D point,
  assuming stepwise motion."
  [point]
  (let [[xs ys] (memo-stepwise-per-dimension point)]
    (for [x xs y ys :when (not= x y)] [x y])))

(def memo-stepwise-per-point (memoize stepwise-per-point))

(defn manhattan-distance [start-pt end-pt]
  (reduce + (mapv #(Math/abs (- %1 %2)) start-pt end-pt)))

(def memo-manhattan-distance (memoize manhattan-distance))

(defn manhattan-distances
  "Find the manhattan/taxi distance between each point in to-coll
  and each point in from-coll."
  [from-coll to-coll]
  (for [start from-coll
        end   to-coll]
    (memo-manhattan-distance start end)))

(defn total-m-distances
  "Find the total manhattan/taxi distance between each point in
  to-coll and all points in from-coll"
  [from-coll to-coll]
  (->> (manhattan-distances from-coll to-coll)
       (partition-all (count from-coll))
       (map #(reduce + %))))

(defn no-dupes [coll-one]
  (filter (fn [pt] (not (some #{pt} coll-one)))))

(def next-steps (mapcat memo-stepwise-per-point))

(defn next-tenney-layer
  "Generate a layer of coordinates according to Tenney's algorithm.
  NB: ASSUMES 2 DIMENSIONS FOR NOW."
  [current-crystal]
  (let [builder (comp next-steps (no-dupes current-crystal))]
    (sequence builder current-crystal)))

(defn next-coord [used-pitches]
  (if (empty? used-pitches)
    [0 0]
    (let [layer (next-tenney-layer used-pitches)]
      (->> layer
           (total-m-distances used-pitches)
           (zipmap layer)
           (sort-by second)
           first    ; get closest
           first)))) ; get coord

(defn coord->freq
  "Convert a coordinate in a Tenney Crystal into a frequency,
  given a fundamental and set of 'dimensions,' which represent
  partials over the fundamental."
  [fundamental dimensions coord]
  (let [rat (reduce (fn [[dim1 cval1] [dim2 cval2]]               
                      (* (Math/pow dim1 cval1)
                         (Math/pow dim2 cval2)))
             (zipmap dimensions coord))]
    (Math/abs (* fundamental rat))))

;;; start of transducer-based refactor
(defn m-distance-finding [coll]
  (fn [reduction]
    (fn
      ([acc] acc)
      ([acc pt]
       (reduction acc (reduce + (mapv #(manhattan-distance pt %) coll)))))))

(defn step-finding [reduction]
  (fn
    ([acc] acc)
    ([acc pt]
     (reduction acc pt))))

