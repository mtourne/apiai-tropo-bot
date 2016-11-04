# apiai-tropo-bot

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

This is a fork of the 'one-click integration' that api.ai offers.

This will let you intiate conversation, And leverage api.ai at the same time.

Here is a simple process to do that :

1. create a trigger intent in api.ai (a literal one with the @ in front)
   for instance @question_demo

2. deploy this on heroku, and once done set it up as the webApi endpoint
   inside your tropo application GUI.
   for instance: https://sore-heron.herokuapp.com/sms

    (don't forget the /sms, that's the endpoint the bot listens on)

3. use the Tropo Rest API to send a trigger that will in turn call
   this WebApi
   (essentially when called via Rest,
   Tropo calls your Api endpoint to figure out what to do)

    example :

    ```
        $ curl 'http://api.tropo.com/1.0/sessions?token=<TROPO_APP_TOKEN>&start_conversation=true&send_to=<PHONE_NUMBER>&message=question_demo'
    ```

    question_demo will in turn be passed to api.ai and with the response,
    Tropo still waiting for what to do will be told to send a message
    with the text to `<PHONE_NUMBER>`
