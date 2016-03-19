(ns pando.templates
  (:use (hiccup core page)))

(defn normal-client
  "HTML for a normal client - allows for chatting, but only hears own part"
  [username]
  (html5
   [:head]
   [:body
    (include-js "/static/normal.js")]))

(defn admin-client
  "HTML for an admin client - no chatting, hears all parts"
  []
  (html5
   [:head]
   [:body
    (include-js "/static/admin.js")]))
