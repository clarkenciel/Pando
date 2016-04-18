(defproject pando "0.1.0-SNAPSHOT"
  :description "Distributed, chat-based installation."
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}
  ;; avoid compatibility issues with java 7
  :dependencies [[org.clojure/clojure "1.7.0"]
                 [aleph "0.4.0"]     ; client-server networking
                 [manifold "0.1.2"]  ; managing asynchronous values
                 [compojure "1.5.0"] ; http routing                 
                 [ring/ring-json "0.4.0"] ; deliver response bodies as json
                 [hiccup "1.0.5"]
                 [cheshire "5.5.0"]] ; this dep might be redundant
  :test-path "test/pando"
  :main pando.core
  :plugins [[lein-ring "0.9.7"]]
  :ring {:handler pando.core/app-routes}
  :profiles
  {:uberjar {:omit-source true
             :aot :all
             :uberjar-name "pando-site.jar"
             :source-paths ["src"]
             :resource-paths ["resources/pando"]
             }})
