/**
 * Jquery Doom Chat Plugin
 *
 * @author Dumitru Glavan
 * @version 1.0
 *
 * @ TODO Move HTML from code to templates
 * @ TODO Filter the HTML tags in the messages
 *
 */
(function ($) {
    $.fn.doomChat = function (options) {
        this.config = $.extend({
            userData: {},
            users: [],
            userList: '#doom-chat-user-list',
            userListHtml: '<li class="doom-chat-user-list-user" data-id="{id}" data-name="{name}" data-thumb="{thumb}" data-status="{status}">\n\
                    <img src="{thumb}" class="doom-chat-list-thumb" />\n\
                    <span class="doom-chat-user-name">{name}</span><span class="status {status} doom-chat-list-status"></span>\n\
                </li>',
            statusButton: '#doom-chat-status',
            winCnt: '#doom-chat-win-cnt',
            winHtml: '<li class="doom-chat-win-log-cnt {status}" id="doom-chat-win-{id}">\n\
                        <div class="doom-chat-floater-cnt">\n\
                            <ul class="doom-chat-win-toolbar">\n\
                                <li class="doom-chat-win-toolbar-name"><a href="#">{name}</a></li>\n\
                                <li class="doom-chat-win-toolbar-bt-minimize"><a href="#">_</a></li>\n\
                                <li class="doom-chat-win-toolbar-bt-close"><a href="#"></a></li>\n\
                            </ul>\n\
                            <ul class="doom-chat-win-log"></ul>\n\
                            <img src="{meThumb}" class="doom-chat-me-thumb" /><textarea class="doom-chat-win-message"></textarea>\n\
                        </div>\n\
                        <span class="new-msg-count">0</span>\n\
                        <ul class="doom-chat-win-statusbar">\n\
                            <li class="doom-chat-win-toolbar-photo"><img src="{thumb}" /><span class="doom-chat-win-status status"></span></li>\n\
                        </ul>\n\
                    </li>',
            messageHtml: '<li class="doom-chat-message-line {customClass}"><div class="doom-chat-photo"><img src="{thumb}" class="doom-chat-user-thumb" /></div><div class="doom-chat-time">{time}</div><div class="doom-chat-txt">{message}</div></li>',
            onlineCounter: '#doom-chat-status-users-count',
            onlineSwitch: '#doom-chat-online-switch',
            idleClass: 'idle',
            idleTime: 30, //seconds
            noPictureThumb: '/images/doom_chat/no_photo_man_32x32.png', // TODO This should be possible to set by genre, maybe a callback for it...
            onShow: function () {
                this.restoreState();
            },
            onMessage: null,
            onHistory: null,
            onOnlineStatus: null
        }, options);

        var self = this, $self = $(this), $userList = $(this.config.userList), $winCnt = $(this.config.winCnt), $onlineCounter = $(this.config.onlineCounter), $onlineSwitch = $(this.config.onlineSwitch);

        $self.data({
            'config': this.config,
            'userList': $userList,
            'winCnt': $winCnt,
            'existentUsers': {},
            'onlineCounter': $onlineCounter,
            'onlineSwitch': $onlineSwitch
        });

        $self.addUsers(self.config.users);

        $('#doom-chat-status').click(function () {
           if ($userList.hasClass('minimized')) {
               $self.reveal($userList);
           } else {
               $self.minimize($userList);
           }
           $self.saveState();
        });

        $(window).unload(function() {
            $self.saveState();
        });

        $.isFunction(this.config.onShow) && this.config.onShow.call(this);

        $(window).bind('mousemove keydown', function() {
            $self.data('lastOnlineTime', $.now());
        });

        setInterval(function () {
            $self.updateOnlineStatus();
        }, 1000);

        return this;
    },

    $.fn.addChat = function (userData, msg, options) {
        msg = msg || null;
        var time = new Date();
        time = time.getHours() + ':' + time.getMinutes();
        options = $.extend({
            append: false,
            minimized: false,
            newMsgCount: 0,
            isNewMsg: true,
            msgCustomClass: '',
            time: time
        }, options);
        var $self = $(this), config = $self.data('config'), $winCnt = $self.data('winCnt'), existentUsers = $self.data('existentUsers');
        var $win = $self.getWin(userData.id);

        // Chat window doesn't exist yet - create it first
        if (!$win.length) {
            $win = $(config.winHtml.replace(/\{id\}/g, userData.id).replace(/\{name\}/g, userData.name).replace(/\{thumb\}/g, userData.thumb)
                   .replace(/\{status\}/g, userData.status).replace(/\{meThumb\}/g, config.userData.thumb).replace(/\{time\}/g, options.time));
            $win.data({
                userId: userData.id,
                userName: userData.name,
                userThumb: userData.thumb
            });
            $win.find('textarea:first').keyup(function (ev) {
                if (ev.keyCode === 13 && !ev.shiftKey) {
                    $.isFunction(config.onMessage) && config.onMessage.call($win, {id: userData.id}, $.trim($(this).val()));
                    $(this).val('');
                }
            });
            if (options.append) {
                $winCnt.append($win);
            } else {
                $winCnt.prepend($win);
            }

            $win.find('ul.doom-chat-win-statusbar:first')
            .click(function () {
                if ($win.hasClass('minimized')) {
                    $self.minimize();
                    $self.reveal($win);
                } else {
                    $self.minimize($win);
                }
                return false;
            });

            $win.find('ul.doom-chat-win-toolbar:first').click(function () {
                $self.minimize($win);
                return false;
            }).delegate('li.doom-chat-win-toolbar-bt-close:first', 'click', function () {
                existentUsers[$win.data('userId')] = true;
                $win.remove();
                return false;
            });

            if (options.minimized) {
                $self.minimize($win);
            } else {
                $self.minimize();
                $self.reveal($win);
            }
            if (options.isNewMsg && options.newMsgCount) {
                $self.tickNewMsg($win, options.newMsgCount);
            }

            $self.setStatus($win, userData.status);

            // Load conversation history
            $.isFunction(config.onHistory) && config.onHistory.call(this, $win);
        }
        var $msgLog = $win.find('ul.doom-chat-win-log');
        if (msg) {
            var pic = userData.from == config.userData.id ? config.userData.thumb : $win.data('userThumb');
            var nextMsg = config.messageHtml.replace(/\{thumb\}/g, pic).replace(/\{message\}/g, msg)
                          .replace(/\{customClass\}/g, options.msgCustomClass).replace(/\{time\}/g, options.time);
            $msgLog.append(nextMsg);
            if (options.isNewMsg && $win.hasClass('minimized')) {
                $self.tickNewMsg($win, 1);
            }
        }
        $msgLog.scrollTop($msgLog.height() + $msgLog.scrollTop());

        return $win;
    },

    $.fn.minimize = function ($win) {
        var $self = $(this), $winCnt = $self.data('winCnt');
        if ($win) {
            $win.addClass('minimized');
            return true;
        }
        $winCnt.children().each(function (i, el) {
            $self.minimize($(el));
        });
        return true;
    },

    $.fn.reveal = function ($win) {
        var $self = $(this);
        if ($win) {
            $win.removeClass('minimized');
            var $msgLog = $win.find('ul.doom-chat-win-log');
            $msgLog.scrollTop($msgLog.height() + $msgLog.scrollTop());
            $win.find('textarea:first').focus();
            $self.tickNewMsg($win, 0);
            return true;
        }
        return true;
    },

    $.fn.tickNewMsg = function ($win, msgsNr) {
        if ($win) {
            msgsNr = msgsNr || 0;
            var $ticker = $win.find('span.new-msg-count:first');
            if (msgsNr) {
                $ticker.text(parseInt($ticker.text()) + msgsNr);
                $ticker.show();
            } else {
                $ticker.text(msgsNr);
                $ticker.hide();
            }
        }
        return true;
    },

    $.fn.setStatus = function ($win, status) {
        var $self = $(this);
        if ($win) {
            $win.removeClass('online').removeClass('offline').addClass(status).data('userStatus', status);
            return true;
        }
        return true;
    },

    $.fn.getWin = function (userId) {
        var $winCnt = $(this).data('winCnt'), chatWinId = 'doom-chat-win-' + userId;
        return $winCnt.find('#' + chatWinId + ':first');
    },

    $.fn.addUsers = function (users) {
        var self = this, $self = $(this), config = $self.data('config'), $userList = $self.data('userList'), existentUsers = $self.data('existentUsers');

        $.each(users, function (i, user) {

            if (!existentUsers[user.id]) {
                var $el = $(config.userListHtml.replace(/\{name\}/g, user.name)
                        .replace(/\{id\}/g, user.id)
                        .replace(/\{thumb\}/g, user.thumb || config.noPictureThumb)
                        .replace(/\{status\}/g, user.status));

                $el.click(function (ev) {
                    $self.minimize($userList);
                    $self.minimize();
                    $self.reveal($self.addChat({
                        id: $(this).attr('data-id'),
                        name: $(this).attr('data-name'),
                        thumb: $el.attr('data-thumb'),
                        status: $el.attr('data-status')
                    }));
                });

                $userList.append($el);

                existentUsers[user.id] = true;
            } else {
                var $userItem = $userList.find('[data-id="' + user.id + '"]');
                if ($userItem.attr('data-status') != user.status) {
                    $userItem.attr('data-status', user.status);
                    $userItem.find('.status:first')
                             .removeClass('offline').removeClass('online').addClass(user.status);
                }
            }

            var $win = $self.getWin(user.id);
            $win.length && $self.setStatus($win, user.status);
        });

        $self.data({
            'existentUsers': existentUsers,
            'userList': $userList
        });

        $self.updateUserListStats();
    },

    $.fn.updateUserListStats = function () {
        var self = this, $self = $(this), $userList = $self.data('userList'), $onlineCounter = $self.data('onlineCounter');
        var onlineUsers = $userList.find('span.online').length;
        $onlineCounter.text(onlineUsers);
        return onlineUsers;
    },

    $.fn.updateOnlineStatus = function () {
        var self = this, $self = $(this), config = $self.data('config'), $onlineSwitch = $self.data('onlineSwitch');
        var idleTime = parseInt($.now() - $self.data('lastOnlineTime'), 10);
        if (idleTime > config.idleTime) {
            if (!$onlineSwitch.hasClass(config.idleClass)) {
                $onlineSwitch.addClass(config.idleClass);
                $.isFunction(config.onOnlineStatus) && config.onOnlineStatus.call(this, "offline", idleTime);
            }
        } else {
            if ($onlineSwitch.hasClass(config.idleClass)) {
                $onlineSwitch.removeClass(config.idleClass);
                $.isFunction(config.onOnlineStatus) && config.onOnlineStatus.call(this, "online", idleTime);
            }
        }
    },

    $.fn.saveState = function () {
        var self = this, $self = $(this), config = $self.data('config'), $userList = $self.data('userList'), $winCnt = $self.data('winCnt');
        var winState = {};
        $winCnt.children().each(function (i, el) {
            var $el = $(el);
            winState[$el.data('userId')] = {
                minimized: $el.hasClass('minimized'),
                newMsg: parseInt($el.find('span.new-msg-count:first').text())
            };
        });
        var chatState = {
            userList: {
                minimized: $userList.hasClass('minimized')
            },
            win: winState
        };
        chatState = JSON.stringify(chatState)
        $.cookie('doomChat', chatState, {expires: 31, path: '/'});
    },

    $.fn.restoreState = function () {
        var $self = $(this), config = $self.data('config'), $userList = $self.data('userList');
        var chatState = $.cookie('doomChat');

        if (typeof chatState === 'string') {
            chatState = $.parseJSON(chatState);
            if (chatState.userList.minimized) {
                $userList.addClass('minimized');
            } else {
                $userList.removeClass('minimized');
            }
            if (chatState.win) {
                $.each(chatState.win, function (userId, winData) {
                    var $userItem = $userList.find('li[data-id="' + userId + '"]');//$.l($userItem);
                    if ($userItem.length) {
                        $self.addChat({
                            id: $userItem.attr('data-id'),
                            name: $userItem.attr('data-name'),
                            thumb: $userItem.attr('data-thumb'),
                            status: $userItem.attr('data-status')
                        }, null, {
                            minimized: winData.minimized,
                            newMsgCount: winData.newMsg || 0,
                            append: true
                        });
                    }
                });
            }
        }
    }

})(jQuery);