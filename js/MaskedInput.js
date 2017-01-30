var MaskedInput = (function () {
    
    //#region ParsedMask
    
    function ParsedMask(data) {
        var mask = data.mask.split('');
        var optional = data.optional ? data.optional : null;
        
        this.allow = data.templateAllow;
        this.list = [];
        for (var i = 0; i < mask.length; ++i) {
            var letter = mask[i];
            var node = {};
            
            if (letter == data.template) {
                node.isAny = true;
            } else if (optional && optional.indexOf(letter) !== -1) { // TODO: IE8
                node.letter = letter;
                node.isOptional = true;
            } else { 
                node.letter = letter;
            }

            this.list.push(node);
        }
    }
    
    /**
     * Разрешенные символы в маске
     * @var {rexp?}
     */
    ParsedMask.prototype.allow = null;

    /**
     * Разобранная маска
     * @var {array}
     */
    ParsedMask.prototype.list = null;
    
    /**
     * Заполнитьмаску
     * @param text
     * @return {object?}
     */
    ParsedMask.prototype.try = function (text) {
        var result = '';
        var optionals = [];
        
        text = text.split('');
        while (text.length) {
            var letter = text.shift();
            var matching = true;
            
            while (matching) {
                var node = this.list[result.length];

                if (!node) {
                    // битая маска
                    return null;
                } else if (node.isOptional) {
                    // опциональный символ
                    result += node.letter;
                    if (node.letter == letter) {
                        // но если он совпал - дальше не ищем
                        matching = false;
                    } else {
                        optionals.push({
                            letter: node.letter,
                            shift: result.length - 1
                        });
                    }
                } else if (node.isAny) {
                    // "любой" символ
                    if (this.allow.test(letter)) {
                        result += letter;
                        matching = false;
                    } else {
                        // ошибка заполенения маски: ошибочный символ
                        return null;
                    }
                } else if (node.letter && node.letter == letter) {
                    result += letter;
                    matching = false;
                } else {
                    // ошибка заполнения маски
                    return null;
                }
            }
        }
        return {
            text: result,
            optionals: optionals,
            mask: this
        };
    }

    //#endregion

    //#region PhoneMask
    
    /**
     * Класс, описывающий механизм работы с маской.
     * По факту враппер над ParsedMask (для простоты прототипирования)
     * @param maskData
     * @constructor
     */
    function PhoneMask(maskData) {
        this.data = maskData.data || {};
        this.mask = new ParsedMask({
            mask: maskData.mask,
            template: '#',
            templateAllow: /[0-9]/,
            optional: ['+', ' ', '(', ')', '-']
        });
    }
    
    /**
     * Данные приаттачяенные к маске
     * @var {obkect?}
     */
    PhoneMask.prototype.data = null;
    
    /**
     * Маска
     * @var {ParsedMask}
     */
    PhoneMask.prototype.mask = null;
    
    /**
     * Попытаться заполнить маску
     * TODO: наследование
     * @param text
     * @return {object?}
     */
    PhoneMask.prototype.try = function (text) { 
        return this.mask.try(text);
    }
    
    //#endregion

    //#region MaskedInput

    /**
     * Инпут с маской
     * @var options
     * @constructor
     */
    function MaskedInput(options) {
        this.domElement = options.domElement;
        this.updateValue({
            action: this.actions.SET_TEXT,
            text: this.domElement.value
        });
        if (options.masks) {
            for (var i = 0; i < options.masks.length; ++i) { 
                this.masks.push(new PhoneMask(options.masks[i]));
            }
        }
        this.bind();
    }
    
    /**
     * Массив масок
     * @var {array}
     */
    MaskedInput.prototype.masks = [];

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
     * Данные текущей маски
     * @var {Object?}
     */
    MaskedInput.prototype.currentMaskData = null;

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
        }, e);
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
            }, e);
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
        }, e);
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
        // TODO: обработать навигацию (нажитие клавиш влево-вправо)
        this.updateValue({
            action: this.actions.INSERT_TEXT,
            text: String.fromCharCode(e.charCode)
        }, e);
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
        switch (e.keyCode) {
            case this.keyCodes.BACKSPACE:
                // удаление ПРЕДЫДУЩЕГО символа или селекшена
                this.updateValue({
                    action: this.actions.DELETE_PREVIOUS
                }, e);
                break;
            case this.keyCodes.DELETE:
                // удаление СЛЕДУЮЩЕГО символа или селекшена
                this.updateValue({
                    action: this.actions.DELETE_NEXT
                }, e);
                break;
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
     * @return {string}
     */
    MaskedInput.prototype.findMaskValue = function (text) {
        for (var i = 0; i < this.masks.length; ++i) {
            var value = this.masks[i].try(text);

            if (value) {
                this.currentMaskData = value;
                console.log(this.currentMaskData);
                return value.text;
            }
        }
        return '';
    }
    
    /**
     * Применить значение маски к инпуту
     * @param value
     */
    MaskedInput.prototype.applyMaskValue = function (value) { 
        this.domElement.value = value;
    }

    /**
     * Обновить значение
     * @param action
     * @param e
     */
    MaskedInput.prototype.updateValue = function (action, e) {
        var value = this.getNewValue(action);
        
        // TODO: маска должна понимать пустые значения
        if (value) {
            var maskValue = this.findMaskValue(value);
            
            if (e) {
                e.preventDefault();
            }
            if (maskValue) {
                this.applyMaskValue(maskValue);
                this.value = value;
            }
        } else {
            this.value = value;
        }
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
                    value = this.value.slice(0, bound.start) + action.text + this.value.slice(bound.stop);
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
                    if (bound.start == bound.stop) {
                        value = this.value.slice(0, bound.start) + this.value.slice(bound.start + 1);
                    } else {
                        value = this.value.slice(0, bound.start) + this.value.slice(bound.stop);
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
        var opts = this.currentMaskData ? this.currentMaskData.optionals : [];
        var val = this.currentMaskData ? this.currentMaskData.text : [];
        
        console.log(this.currentMaskData);

        /**
         * Посчитать количество опциональных символов которых нет в значении в определенном диапазоне
         * @param optionals
         * @param shift
         * @return {int}
         */
        function getoptionLettersCount(optionals, shift) {
            var result = 0;
            
            for (var i = 0; i < shift; ++i) {
                for (var j = 0; j < optionals.length; ++j) {
                    var item = optionals[j];
                        
                    if (item.shift == i) {
                        result++;
                    }
                }
            }
            return result;
        }
        
        /**
         * Проверить значение и вернуть 0, если значене меньше нуля, в противном случае вернуть значение
         * @param val
         * @return {*}
         */
        function positioveOrZero(val) {
            if (val < 0) { 
                return 0;
            }
            return val;
        }

        if (this.domElement.setSelectionRange) {
            start = this.domElement.selectionStart;
            stop = this.domElement.selectionEnd;
        } else {
            throw "not implemented";
        }
        return {
            start: positioveOrZero(start - getoptionLettersCount(opts, start)),
            stop: positioveOrZero(stop - getoptionLettersCount(opts, stop))
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