var MaskedInput = (function () {
    
    //#region MaskedInput

    /**
     * Инпут с маской
     * @constructor
     */
    function MaskedInput(domElement) {
        this.domElement = domElement;
        this.updateValue({
            action: this.actions.SET_TEXT,
            text: this.domElement.value
        });
        this.bind();
    }

    /**
     * Выполняемые действия
     * @var {Object}
     */
    MaskedInput.prototype.actions = {
        INSERT_TEXT: 0,
        SET_TEXT: 1,
        CUT_TEXT: 2,
        DELETE_PREVIOUS: 3,
        DELETE_NEXT: 4
    };

    /**
     * Коды специфических клавиш
     * @var {Object}
     */
    MaskedInput.prototype.keyCodes = {
        BACKSPACE: 8,
        DELETE: 46
    };

    /**
     * Значение инпута
     * @var {string?}
     */
    MaskedInput.prototype.value = null;

    /**
     * Ссылка на DOM
     * @var {HTMLInputElement?}
     */
    MaskedInput.prototype.domElement = null;

    /**
     * Словарь приаттаченных эвентов
     * @var {Object}
     */
    MaskedInput.prototype.attachedEvents = {};

    /**
     * Добавить обраотчики событий
     */
    MaskedInput.prototype.bind = function () {
        this.attachEvent("keypress");
        this.attachEvent("keydown");
        this.attachEvent("keyup");
        this.attachEvent("drag", true); // внутри "маски" ничего перетаскивать нельзя
        this.attachEvent("dragstart", true); // внутри "маски" ничего перетаскивать нельзя
        this.attachEvent("drop");
        this.attachEvent("cut");
        this.attachEvent("paste");
        this.attachEvent("reset");
    }

    /**
     * Прилепить событие к DOM элементу
     * @param eventName
     * @param prevent
     */
    MaskedInput.prototype.attachEvent = function (eventName, prevent) {
        var that = this;
        
        /**
         * Привести первую букву строки к верхнему регистру
         * @param str
         * @return {string}
         */
        function ucfirst(str) { 
            return str.substr(0, 1).toUpperCase() + str.substr(1);
        }

        if (!this.attachedEvents[eventName]) {
            this.attachedEvents[eventName] = function (e) {
                if (prevent) {
                    e.preventDefault();
                    return false;
                }
                return that["onDomElementValueEvent" + ucfirst(eventName)].apply(that, [e]);
            }
        }

        if (this.domElement.addEventListener) {
            this.domElement.addEventListener(eventName, this.attachedEvents[eventName], false);
        } else if (this.domElement.attachEvent) {
            this.attachEvent("on" + eventName, this.attachedEvents[eventName]);
        }
    };

    /**
     * Событие "ondrop"
     * @param e
     */
    MaskedInput.prototype.onDomElementValueEventDrop = function (e) {
        var that = this;

        setTimeout(function () {
            that.updateValue({
                action: that.actions.INSERT_TEXT,
                text: that.getSelectionValue()
            });
        }, 0);
    };

    /**
     * Событие "oncut"
     * @param e
     */
    MaskedInput.prototype.onDomElementValueEventCut = function (e) {
        var that = this;

        this.updateValue({
            action: that.actions.CUT_TEXT
        });
    };

    /**
     * Событие "onpaste"
     * @param e
     */
    MaskedInput.prototype.onDomElementValueEventPaste = function (e) {
        var that = this;
        var clipboardData = e.clipboardData || window.clipboardData;

        if (clipboardData) {
            that.updateValue({
                action: that.actions.INSERT_TEXT,
                text: clipboardData.getData('Text') || ""
            });
        } else {
            e.preventDefault();
        }
    };

    /**
     * Событие "onreset"
     * @param e
     */
    MaskedInput.prototype.onDomElementValueEventReset = function (e) {
        this.updateValue({
            action: this.actions.SET_TEXT,
            text: this.domElement.value
        });
    };

    /**
     * Событие "onkeypress"
     * @param e
     */
    MaskedInput.prototype.onDomElementValueEventKeypress = function (e) {
        if (e.ctrlKey || e.altKey || e.metaKey) {
            e.preventDefault();
            return true;
        }
        // дописываем введенный символ в инпут
        this.updateValue({
            action: this.actions.INSERT_TEXT,
            text: String.fromCharCode(e.charCode)
        });
    };

    /**
     * Событие "onkeydown"
     * @param e
     */
    MaskedInput.prototype.onDomElementValueEventKeydown = function (e) {
        if (e.shiftKey) {
            // не обрабатываем зажатый Shift:
            //  - человек что-то выделяет в инпуте
            //  - заглавная буква будет доступна через {charCode} в Keypress, дополнительные проверки не нужны
            return true;
        }
        if (e.keyCode == this.keyCodes.BACKSPACE) {
            // удаление ПРЕДЫДУЩЕГО символа или селекшена
            this.updateValue({
                action: this.actions.DELETE_PREVIOUS
            });
        } else if (e.keyCode == this.keyCodes.DELETE) {
            // удаление СЛЕДУЮЩЕГО символа или селекшена
            this.updateValue({
                action: this.actions.DELETE_NEXT
            });
        } else {
            // проверка маски
            // если нет подходящих масок, то прерываем ввод символа
            var masks = this.findMasks(this.getNewValue({
                action: this.actions.INSERT_TEXT,
                text: String.fromCharCode(e.charCode)
            }));
            if (masks.length == 0) {
                e.preventDefault();
            } else {
                // ищем и обарабатываем маску
            }
        }
    };

    /**
     * Событие "onkeyup"
     * @param e
     */
    MaskedInput.prototype.onDomElementValueEventKeyup = function (e) {
        return true;
    };

    /**
     * Найти маску, подходящую под значение
     * @param text
     * @return {Array}
     */
    MaskedInput.prototype.findMasks = function () {
        return [null];
    }

    /**
     * Применить маску к инпуту
     * @param mask
     */
    MaskedInput.prototype.applyMask = function (mask) {

    }

    /**
     * Обновить значение
     * @param action
     */
    MaskedInput.prototype.updateValue = function (action) {
        this.value = this.getNewValue(action);
    }

    /**
     * Обновить значение в инпуте
     * @param action
     * @return {String}
     */
    MaskedInput.prototype.getNewValue = function (action) {
        var bound = this.getSelectionBounds();
        var value = '';

        try {
            switch (action.action) {
                case this.actions.SET_TEXT:
                    value = action.text;
                    break;
                case this.actions.CUT_TEXT:
                    value = this.value.slice(0, bound.start) + this.value.slice(bound.stop);
                    break;
                case this.actions.INSERT_TEXT:
                    value = this.value.slice(0, bound.start) + action.text + this.value.slice(bound.start);
                    break;
                case this.actions.DELETE_PREVIOUS:
                    if (bound.start == 0 && bound.stop == 0) {
                        value = this.value;
                    } else {
                        if (bound.start == bound.stop) {
                            value = this.value.slice(0, bound.start - 1) + this.value.slice(bound.start);
                        } else {
                            value = this.value.slice(0, bound.start) + this.value.slice(bound.stop);
                        }
                    }
                    break;
                case this.actions.DELETE_NEXT:
                    if (bound.start == 0 && bound.stop == 0) {
                        value = this.value;
                    } else {
                        if (bound.start == bound.stop) {
                            value = this.value.slice(0, bound.start) + this.value.slice(bound.start + 1);
                        } else {
                            value = this.value.slice(0, bound.start) + this.value.slice(bound.stop);
                        }
                    }
                    break;
            }
        } catch (e) {
            console.log(e);
        }
        console.log(bound, action, this.value, value);
        return value;
    }

    /**
     * Получить позицию каретки
     * @return {Object}
     */
    MaskedInput.prototype.getSelectionBounds = function () {
        var start, stop;

        if (this.domElement.setSelectionRange) {
            start = this.domElement.selectionStart;
            stop = this.domElement.selectionEnd;
        } else {
            throw "not implemented";
        }
        return {
            start: start,
            stop: stop
        };
    };

    /**
     * Получить выделенный текст
     * @return {Object}
     */
    MaskedInput.prototype.getSelectionValue = function () {
        var text = '';

        if (window.getSelection) {
            text = window.getSelection().toString()
        } else {
            throw "not implemented";
        }
        return text;
    }
    
    //#endregion

    return MaskedInput;

})();