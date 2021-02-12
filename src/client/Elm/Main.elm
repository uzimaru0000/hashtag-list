module Main exposing (..)

import Browser
import Browser.Navigation as Navigation
import Html exposing (..)
import Html.Attributes as Attrs
import Html.Events as Ev
import Html.Keyed as Keyed
import Http
import Task
import Time
import Tweet exposing (..)
import Url exposing (Url)
import Url.Builder as Builder


main : Program Flags Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlRequest = UrlRequest
        , onUrlChange = always NoOp
        }


type alias Flags =
    { accessToken : Maybe String
    , accessSecret : Maybe String
    , query : Maybe String
    }


type alias Model =
    { accessToken : Maybe String
    , accessSecret : Maybe String
    , query : Maybe String
    , key : Navigation.Key
    , tweets : List Status
    , shownTweets : List Status
    , sinceID : String
    , inputStr : String
    }


init : Flags -> Url -> Navigation.Key -> ( Model, Cmd Msg )
init flags _ key =
    ( { accessToken = flags.accessToken
      , accessSecret = flags.accessSecret
      , query = flags.query
      , key = key
      , tweets = []
      , shownTweets = []
      , sinceID = ""
      , inputStr = flags.query |> Maybe.withDefault ""
      }
    , Task.perform GetTime Time.now
    )


type Msg
    = NoOp
    | UrlRequest Browser.UrlRequest
    | Input String
    | Search
    | Dequeue
    | Request
    | GetTweets (Result Http.Error Tweets)
    | GetTime Time.Posix


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Request ->
            ( model
            , case ( model.accessToken, model.accessSecret, model.query ) of
                ( Just accessToken, Just accessSecret, Just query ) ->
                    search
                        accessToken
                        accessSecret
                        query
                        model.sinceID
                        GetTweets

                _ ->
                    Cmd.none
            )

        GetTweets (Ok tweets) ->
            ( { model | tweets = mergeTweets model.tweets tweets.status, sinceID = tweets.sinceID }
            , Cmd.none
            )

        Input str ->
            ( { model | inputStr = str }, Cmd.none )

        Search ->
            update Request { model | tweets = [], query = Just model.inputStr, shownTweets = [] }
                |> Tuple.mapSecond (List.singleton >> (::) (Navigation.pushUrl model.key (Builder.absolute [] <| queryBuilder model)) >> Cmd.batch)

        Dequeue ->
            ( { model
                | shownTweets =
                    (model.tweets
                        |> dequeue
                        |> Maybe.map List.singleton
                        |> Maybe.withDefault []
                    )
                        ++ model.shownTweets
                , tweets =
                    List.tail model.tweets |> Maybe.withDefault []
              }
            , Cmd.none
            )

        GetTime time ->
            update
                Request
                { model | sinceID = String.fromInt <| Time.posixToMillis time }

        UrlRequest request ->
            case request of
                Browser.Internal url ->
                    ( model, Navigation.load (Url.toString url) )

                Browser.External url ->
                    ( model, Navigation.load url )

        _ ->
            ( model, Cmd.none )


mergeTweets : List Status -> List Status -> List Status
mergeTweets prevTweets tweets =
    prevTweets ++ List.reverse tweets


dequeue : List Status -> Maybe Status
dequeue status =
    List.head status


queryBuilder : Model -> List Builder.QueryParameter
queryBuilder model =
    [ Builder.string "oauth_token" <| Maybe.withDefault "" model.accessToken
    , Builder.string "oauth_token_secret" <| Maybe.withDefault "" model.accessSecret
    , Builder.string "q" model.inputStr
    ]


subscriptions : Model -> Sub Msg
subscriptions model =
    [ Time.every 5000 (always Request)
    , Time.every 1000 (always Dequeue)
    ]
        |> Sub.batch


view : Model -> Browser.Document Msg
view model =
    { title = "Hash List"
    , body =
        [ case ( model.accessToken, model.accessSecret ) of
            ( Just _, Just _ ) ->
                withLoginView model

            ( _, _ ) ->
                withoutLoginView ()
        ]
    }


withoutLoginView : () -> Html Msg
withoutLoginView _ =
    div [ Attrs.class "without-login-view" ]
        [ a [ Attrs.href "/auth/twitter" ] [ text "SignIn with Twitter" ]
        ]


withLoginView : Model -> Html Msg
withLoginView model =
    div [ Attrs.class "with-login-view" ]
        [ div
            [ Attrs.class "form" ]
            [ input
                [ Attrs.value model.inputStr
                , Ev.onInput Input
                ]
                []
            , button [ Ev.onClick Search ] [ text "Search" ]
            ]
        , Keyed.node "div"
            []
            (model.shownTweets
                |> List.map (\t -> ( t.id, tweetView t ))
            )
        ]
