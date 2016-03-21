(ns pando.templates
  (:require [hiccup.core :as h]
            [hiccup.page :as p]))

(defn normal-client
  "HTML for a normal client - allows for chatting, but only hears own part"
  [username]
  (h/html
   [:head]
   [:body
    (p/include-js "/static/normal.js")]))

(defn admin-client
  "HTML for an admin client - no chatting, hears all parts"
  []
  (h/html
   [:head]
   [:body
    (p/include-js "/static/admin.js")]))
