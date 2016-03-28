(ns pando.templates
  (:require [hiccup.core :as h]
            [hiccup.page :as p]
            [hiccup.form :as f]))

(defn post-form
  [room-name user-name]
  (f/form-to [:post "/add_message"]
             [:div.form-group
              (f/text-field {:style "display:none;"} "user-name" user-name)
              (f/label {} "message" "Message:")
              (f/text-area {:id "message-area"
                            :placeholder "Enter a message..."} "message")
              (f/submit-button {:id "message-submit"} "Send")]))

(defn post-area [room-name user-name]
  [:div#post-area
   [:div#post-user-name
    [:p (clojure.string/capitalize (str user-name))]]
   [:div#post-divider]
   [:div#post-entry
    (post-form room-name user-name)]])


(defn display-area [room-name]
  [:div#display-area
   [:div#room-name
    [:h1 (clojure.string/capitalize (str room-name))]]
   [:div#messages]
   [:div#display-divider]])

(defn normal-client
  "HTML for a normal client - allows for chatting, but only hears own part"
  [room-name user-name]
  [:div#main
   (display-area room-name)
   (post-area room-name user-name)
   (p/include-js "/static/normal.js")])

(defn admin-client
  "HTML for an admin client - no chatting, hears all parts"
  [room-name]
  [:div#main
   (display-area room-name)
   (p/include-js "/static/admin.js")])

(defn join-form
  "Form for joining a room"
  []
  [:div#main
   (f/form-to [:post "/join"]
              [:div.form-group
               (f/label {:class "form-label"} "user-name" "Name: *")
               (f/text-field {:id "join-user-name"
                              :class "form-field"
                              :placeholder "name"}
                             "user-name")]
              [:div.form-group
               (f/label {:class "form-label"} "room-name" "Room: *")
               (f/text-field {:id "join-room-name"
                              :class "form-field"
                              :placeholder "room name"}
                             "room-name")]
              [:div.form-group
               (f/submit-button {:id "join-submit"} "Join")])])

(defn errors [messages]
  (reduce conj
          [:div#alerts]
          (mapv #(vector :p %)
                (if (sequential? (first messages))
                  (apply concat messages)
                  messages))))

(defn page
  "Basic page contents"
  ([contents & error-ms]
   (h/html
    [:head]
    (reduce conj [:body (errors error-ms)] [contents]))))
