# DevTinder APIs

## authRouter
- POST /signup
- POST /login
- POST /logout

## profileRouter
- GET /profile/view
- PATCH /profile/edit
- PATCH /profile/password

## ConnectionRequestRouter
- POST /request/send/ignored/:userId
- POST /request/send/interested/:userId
- POST /request/review/accepted/:requestId
- POST /request/review/rejected/:requestId

## userRouter 
- GET /user/connections -> Gets you all your connections
- GET /user/requests -> Gets you all the request you received from other user
- GET /user/feed -> Get you the profile of other users on pltaform
