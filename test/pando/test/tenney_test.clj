(ns pando.test.tenney-test
  (:require [clojure.test :refer :all]
            [pando.tenney :refer :all]))

(deftest test-coord->freq
  (testing "origin coord yields fundamental"
    (let [f 220
          ds [[2 3] [3 5] [9 11] [1 7]]
          c [0 0]]
      (is (every? #(= (double f) %)
                  (map #(coord->freq f % c) ds)))))

  (testing "stepwise motion"
    (let [f 220
          d [2 3]
          cs [[0 0] [1 0]   [0 1]   [-1 0]  [0 -1]]
          rs [f     (* f 2) (* f 3) (/ f 2) (/ f 3)]]
      (is (every? #(= (first %) (second %))
                  (zipmap (map double rs) ; coerce as double
                          (map #(coord->freq f d %) cs))))))

  (testing "diagonal motion"
    (let [f 200
          d [2 3]
          cs [[1 1]     [-1 -1]]
          rs [(* f 2 3) (/ f 2 3)]]
      (is (every? #(= (first %) (second %))
                  (zipmap (map double rs)
                          (map #(coord->freq f d %) cs)))))))

(deftest test-manhattan
  (testing "manhattan distance 2 pts"
    (is (= 2 (manhattan-distance [0 0] [ 1  1])))
    (is (= 2 (manhattan-distance [0 0] [-1 -1])))
    (is (= 1 (manhattan-distance [0 0] [ 0  1])))
    (is (= 1 (manhattan-distance [0 0] [ 1  0])))
    (is (= 1 (manhattan-distance [0 0] [ 0 -1])))
    (is (= 1 (manhattan-distance [0 0] [-1  0]))))
  
  (testing "equal-legth collections"
    (let [coll1 [[0 0] [ 0  0] [0  0] [ 0 0]]
          coll2 [[1 1] [-1 -1] [1 -1] [-1 1]]
          dists (manhattan-distances coll1 coll2)
          rslts (take 16 (repeat 2))]
      (is (= dists rslts))))

  (testing "different-length collections"
    (let [coll1 [[0 0] [ 0  0] [0  0]]
          coll2 [[1 1] [-1 -1] [1 -1] [-1 1]]
          dists (manhattan-distances coll1 coll2)
          rslts (take 12 (repeat 2))]
      (is (= dists rslts))))

  (testing "manhattan distance totals"
    (let [coll1 [[0 0] [ 0  0] [0  0] [ 0 0]]
          coll2 [[1 1] [-1 -1] [1 -1] [-1 1]]
          dists (total-m-distances coll1 coll2)
          rslts (take 4 (repeat 8))]
      (is (= dists rslts)))))

(deftest test-tenney-crystal
  (testing "generating tenney-layer"
    (is (= 0 1) "implement me!"))

  (testing "generating next coordinate"
    (is (= 0 1) "implement me!")))
