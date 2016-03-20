(ns pando.test.tenney-test
  (:require [clojure.test :refer :all]
            [pando.tenney :refer :all]))

(deftest test-coord->freq
  (testing "origin coord yields fundamental"
    (let [f 220
          ds [[2 3] [3 5] [9 11] [1 7]]
          c [0 0]]
      (is (every? #(= f %)
                  (map #(coord->freq f % c) ds)))))

  (testing "stepwise motion"
    (let [f 220
          d [2 3]
          cs [[0 0] [1 0]   [0 1]   [-1 0]  [0 -1]]
          rs [f     (* f 2) (* f 3) (/ f 2) (/ f 3)]]
      (is (every? #(= %1 %2)
                  (zipmap rs (map #(coord->freq f d %) cs))))))

  (testing "diagonal motion"
    (let [f 200
          d [2 3]
          cs [[1 1]     [-1 -1]]
          rs [(* f 2 3) (/ f 2 3)]]
      (is (every? #(= %1 %2)
                  (zipmap rs (map #(coord->freq f d %) cs)))))))


