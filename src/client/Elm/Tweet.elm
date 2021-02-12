module Tweet exposing (..)

import Html exposing (..)
import Html.Attributes as Attrs
import Http
import Json.Decode as JD
import Url.Builder as Url



-- Types


type alias User =
    { name : String
    , screenName : String
    , image : String
    }


type alias Status =
    { id : String
    , text : String
    , user : User
    }


type alias Tweets =
    { status : List Status
    , sinceID : String
    }



-- Decoder


userDecoder : JD.Decoder User
userDecoder =
    JD.map3 User
        (JD.field "name" JD.string)
        (JD.field "screen_name" JD.string)
        (JD.field "profile_image_url_https" JD.string)


statusDecoder : JD.Decoder Status
statusDecoder =
    JD.map3 Status
        (JD.field "id_str" JD.string)
        (JD.field "text" JD.string)
        (JD.field "user" userDecoder)


tweets : JD.Decoder Tweets
tweets =
    JD.map2 Tweets
        (JD.field "statuses" <| JD.list statusDecoder)
        (JD.at [ "search_metadata", "max_id_str" ] JD.string)



-- View


tweetView : Status -> Html msg
tweetView { text, user } =
    div
        [ Attrs.class "list-item" ]
        [ div [ Attrs.class "list-item-avatar-wrapper" ]
            [ img
                [ Attrs.src user.image
                , Attrs.class "list-item-avatar"
                ]
                []
            ]
        , div
            []
            [ div
                [ Attrs.class "list-item-name" ]
                [ span [] [ Html.text user.name ]
                , span [] [ Html.text <| "@" ++ user.screenName ]
                ]
            , div
                [ Attrs.class "list-item-content" ]
                [ Html.text text ]
            ]
        ]



-- Request


search : String -> String -> String -> String -> (Result Http.Error Tweets -> msg) -> Cmd msg
search accessToken accessSecret query sinceID msg =
    Http.request
        { method = "GET"
        , headers = [ [ accessToken, accessSecret ] |> String.join ":" |> Http.header "authorization" ]
        , url = Url.absolute [ "api", "search" ] [ Url.string "q" query, Url.string "since_id" sinceID ]
        , body = Http.emptyBody
        , expect = Http.expectJson msg tweets
        , timeout = Nothing
        , tracker = Nothing
        }
