(ns pando.templates
  (:require [hiccup.core :as h]
            [hiccup.page :as p]
            [hiccup.form :as f]
            [cheshire.core :as c]))

(defn invisible-field [name val]
  (f/text-field {:style "display:none;"} name val))

(defn post-form
  [{:keys [name root]} user-name]
  (f/form-to [:post "/add_message"]
             [:div.form-group
              (invisible-field "user-name" user-name)
              (invisible-field "room-name" name)
              (f/label {} "message" "Message:")
              (f/text-area {:id "message-area"
                            :placeholder "Enter a message..."}
                           "message")
              [:div#message-submit.button               
               "Send"]]))

(defn post-area [room user-name]
  [:div#post-area
   [:div#post-user-name
    [:p (clojure.string/capitalize (str user-name))]]
   [:div#post-divider]
   [:div#post-entry
    (post-form room user-name)]])


(defn display-area [room-name]
  [:div#display-area
   [:div#room-name
    [:h1 (clojure.string/capitalize (str room-name))]]
   [:div#messages]
   [:div#display-divider]])

(defn logout []
  [:div#logout
   (f/form-to [:post "/leave"]
              [:div.form-group
               (f/submit-button {:id "leave-submit"} "Leave")])])

(defn normal-client
  "HTML for a normal client - allows for chatting, but only hears own part"
  [{:keys [room-name root]} {:keys [user-name coord]}]
  [:div#main {:site-data
              (c/generate-string {:user-name user-name
                                  :room-name room-name
                                  :coord     coord
                                  :root      root})}
   (logout)
   (display-area room-name)
   (post-area room-name user-name)
   (p/include-js "/js/client.js")
   (p/include-js "/js/normal.js")])

(defn admin-client
  "HTML for an admin client - no chatting, hears all parts"
  [room-name]
  [:div#main
   (logout)
   (display-area room-name)
   (p/include-js "/js/client.js")
   (p/include-js "/js/admin.js")])

(defn labeled-radio [label]
  [:label (f/radio-button {} "room-name" false label)
   (str "   " label "    ")])

(defn join-form
  "Form for joining a room"
  [{:keys [rooms]}]
  [:div#main
   (f/form-to [:post "/join"]
              [:div.form-group
               (f/label {:class "form-label"} "user-name" "Name: *")
               [:br]
               (f/text-field {:id "join-user-name"
                              :class "form-field"
                              :placeholder "name"}
                             "user-name")]
              [:br]
              [:div.form-group
               (f/label {:class "form-label"} "room-name" "Room: *")
               [:br]
               [:label
                (f/radio-button {} "room-name" nil "")
                (f/text-field {:id "join-room-name"
                               :class "form-field"
                               :placeholder "New room name"}
                              "new-room-name")]
               (reduce conj [:div {:class "btn-group"}]
                       (mapv labeled-radio (keys rooms)))]
              [:br]
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
    [:head
     (p/include-js
      "https://cdnjs.cloudflare.com/ajax/libs/knockout/3.4.0/knockout-min.js")]
    (reduce conj [:body (errors error-ms)] [contents]))))
