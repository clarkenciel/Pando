(ns pando.templates
  (:require [hiccup.page :refer [include-css include-js html5]]))

(defn index []
  (html5
   [:head
    [:title "Pando"]
    [:meta {:name "viewport" :content "initial-scale=1.0"}]
    (include-css "/pando/styles/main.css")
    ;;(include-js "/pando/scripts/cracked/dist/cracked.min.js")
    (include-js "/pando/scripts/cracked/dist/cracked.js")]
   [:body
    [:div {:id "app"} (include-js "/pando/scripts/main.min.js")]]
   [:footer.tiny_text
    [:div
     [:p "&#169; Danny Clarke, 2016 "]]
    [:div
     [:p
      "Icons made by "
      [:a {:href "http://www.freepik.com" :title "Freepik"} "Freepik "]
      "from "
      [:a {:href "http://www.flaticon.com" :title "Flaticon "}
       "www.flaticon.com "]
      "is licensed by "
      [:a {:href "http://creativecommons.org/licenses/by/3.0/" :title "Creative Commons BY 3.0 "
           :target "_blank"}
       "CC 3.0 BY"]]]]))
