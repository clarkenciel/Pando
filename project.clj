(defproject pando "0.1.0-SNAPSHOT"
  :description "Distributed, chat-based installation."
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}
  ;; avoid compatibility issues with java 7
  :jvm-opts ["-Dmanifold.disable-jvm8-primitives=true"
             "-Xmx2G"]
  :dependencies [[org.clojure/clojure "1.7.0"]
                 [aleph "0.4.0"]     ; client-server networking
                 [manifold "0.1.2"]  ; managing asynchronous values
                 [gloss "0.2.5"]     ; conversion to/from bytes
                 [compojure "1.5.0"] ; http routing
                 [org.clojure/core.async "0.2.374"] ; async!
                 [ring/ring-json "0.4.0"] ; deliver response bodies as json
                 [cheshire "5.5.0"]] ; this dep might be redundant
  :test-path "test/pando"
  :main pando.core
  :profiles
  {:uberjar {:omit-source true
             :aot :all
             :uberjar-name "pando-site.jar"
             :source-paths ["src"]
             :resource-paths ["resources"]}})
