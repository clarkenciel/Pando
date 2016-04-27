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


(comment

  ;; bet this can be a transducer....
  (defn incrementer
    "Start from the last sequencable in a vector of sequencables.
     Return a new vector with the sequencable at the current index missing its head.
     Repeat, targeting the same sequencable, until that sequencable is empty.
     Repeat, moving backward through the vector, until all the sequencables have been
     dealt with (i.e. index is -1)."
    [originals]
    (fn [v-seqs]
      (loop [i       (dec (count v-seqs))
             v-seqs' v-seqs]
        (if (= i -1)
          nil
          (if-let [rst (next (v-seqs' i))]
            (assoc v-seqs' i rst)
            (recur (dec i) (assoc v-seqs' i (originals i))))))))

  (defn stepper [increment-fn]
    (fn [seqs]
      (loop [accum []
             seqs' seqs]        
        (if (empty? seqs')
          accum
          (recur (conj accum (map (fn [s]
                                    (first s)) seqs'))
                 (increment-fn seqs'))))))

  (defn cartesian-product [& seqs]
    (when-let [vseqs (and (every? seq seqs) (vec seqs))]
      (-> (vec vseqs)
          incrementer
          stepper
          (apply [vseqs]))))
  
  (let [vsq [[1 2] [3 4] [5 6]]]
    ;;((stepper (incrementer vsq)) vsq)
    (apply cartesian-product vsq)
    ;;(apply c-prod vsq)
    ;;(apply cartesian-product vsq)
    )

  ;;; attempt at transducer version
  (defn nexter [c]
    (sequence (take-while (comp not nil?))
              (iterate next c)))

  (defn lift-conj-to [col]
    (fn [x]
      (if (sequential? col)
        (conj col x)
        (vector col x))))
  
  (defn c-prod [col1 col2]
    (mapcat 
     (fn [col]
       (map
        (lift-conj-to col)
        col2))
     col1))

  (defn cartesian-product [cols]
    (reduce c-prod cols))
  
  (def next-ducer (map nexter))
  
  )
