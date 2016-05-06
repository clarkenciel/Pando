(ns pando.tenney)

;; TENNEY CRYSTALZZZ
;; pitches are dealt with as n-dimensional coordinates in a crystal structure
;; that represents the o-tonal space of a fundamental

(defn cartesian-reduction [step]
  (fn cart
    ([acc] acc)
    ([acc ys]
     (step [] ; we don't actually want to track the acc
           (for [x acc y ys] (conj x y)))))) 

(defn cartesian-product [cols]
  (transduce (map cartesian-reduction) conj [[]] cols))

(defn generate-motion-possibilities
  "Generate list of possible motions for each dimension in a given dimensionality
  E.g. dimensionality: 2 -> [[-1 0 1] [-1 0 1]]"
  [dimensionality]
  (take dimensionality (repeat [-1 0 1])))

(defn diagonal-motion?
  "Detect whether a a motion would result in diagonal, rather than step-wise, motion."
  [motion]
  (< 1
     (reduce #(+ (Math/abs %1) (Math/abs %2))
             motion)))

(defn filter-diagonals [motions]
  (filter (comp not diagonal-motion?) motions))

(defn generate-motions [point]
  (let [d (count point)]
    (transduce
     (comp cartesian-reduction
           (map filter-diagonals))
     concat [[]]
     (generate-motion-possibilities d))))

(defn apply-motion
  "E.g. point: [0 0] motion: [-1 0] -> [-1 0]"
  [point motion]
  (map #(+ %1 %2) point motion))

(defn generate-new-points [point]
  (map #(apply-motion point %) (generate-motions point)))

(def memo-new-points (memoize generate-new-points))

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

(def next-steps (mapcat memo-new-points))

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
