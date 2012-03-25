###
  Chat system setup
###

class App.ChatView extends Backbone.View

  el: null

  socketUrl: "http://#{window.location.hostname}/chat"

  userData: null

  initialize: ()->
    @userData = App.profile

  render: ()->
    that = @
    $self = $(@el)

    @socket = window.io.connect(@socketUrl)
    @socket.on "new-message", (data)->
      time = new Date()
      $self.addChat(data, data.text, {
          time: time.getHours() + ':' +time.getMinutes()
      });

    @socket.on "connect", (socket)->
      sessionId = that.socket.socket.sessionid
      that.socket.emit("set-client", {user_id: that.userData.id, session_id: sessionId})

    @getChatList @loadChat

  loadChat: (usersList)=>
    that = @
    $self = $(@el)
    $self.doomChat
      userData: @userData
      users: usersList
      onMessage: (userData, msg) ->
        $.ajax
          url: '/send'
          type: 'post'
          data:
            to_user_id: userData.id,
            text: msg

      onHistory: ($win) ->
        self = @
        $self = $(@)
        config = $self.data('config')
        pastTime = new Date().getTime() - 24 * 60 * 60 * 1000
        $.ajax
          url: "/messages/{userId}/{since}".replace(/\{userId\}/g, $win.data('userId')).replace(/\{since\}/g, pastTime)
          dataType: 'json'
          success: (data) ->
            $.each(data, (i, msg) ->
              time = new Date(msg.created)
              time = time.getHours() + ":" + time.getMinutes()
              $self.addChat(
                {
                  id: $win.data('userId')
                  name: $win.data('userName')
                  thumb: $win.data('userThumb')
                  status: $win.data('userStatus')
                  from: msg.user_id
                }, msg.text, {
                  isNewMsg: false
                  time: time
                }
              )
            )
            if $win.data('userStatus') is 'offline'
              $self.addChat(
                {
                  id: $win.data('userId')
                  name: $win.data('userName')
                  thumb: $win.data('userThumb')
                  status: $win.data('userStatus')
                  from: 'system'
                }, "#{$win.data('userName')} is offline.", {
                  isNewMsg: false
                  msgCustomClass: 'is-offline-msg'
                }
              )

      onOnlineStatus: (status)->
        $.ajax
          url: '/status'
          type: 'put'
          data:
            status: status

    setInterval(
        ()->
          that.getChatList that.addUsers
        ,
        1500
    )

  addUsers: (users)=>
    if users and users.length
      @el.addUsers(users)

  getChatList: (callback)=>
    $.getJSON '/chat-users', (response)->
        callback(response)
