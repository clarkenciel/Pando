(defproject pando "0.1.0-SNAPSHOT"
  :description "Distributed, chat-based installation."
  :license {:name "Eclipse Public License"
            :url "http://www.eclipse.org/legal/epl-v10.html"}
  :dependencies [[org.clojure/clojure "1.7.0"]
                 [aleph "0.4.0"]     ; client-server networking
                 [manifold "0.1.2"]  ; managing asynchronous values
                 [gloss "0.2.5"]     ; conversion to/from bytes
                 [compojure "1.5.0"] ; http routing
                 [org.clojure/core.async "0.2.374"] ; async!
                 [ring/ring-json "0.4.0"] ; deliver response bodies as json
                 [cheshire "5.5.0"]] ; this dep might be redundant
  :test-path "test/pando")
