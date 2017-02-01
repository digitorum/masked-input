var MaskedInput = (function () {
    
    //#region Caret and CaretData
    
    //#region CaretData

    /**
     * Данные положения каретки
     * @constructor
     */
    function CaretData() {
        this.original = {
            start: 0,
            stop: 0
        };
    }
    
    /**
     * "Оригинальное" положение каретки в инпуте
     * @var {object?}
     */
    CaretData.prototype.original = null;
    
    /**
     * Положение каретки без учета маски
     * @var {int}
     */
    CaretData.prototype.start = 0;

    /**
     * Положение каретки без учета маски
     * @var {int}
     */
    CaretData.prototype.stop = 0;
    
    //#endregion
    
    //#region Caret

    /**
     * "Хэлпер" для работы с кареткой и селекшенами
     * @constructor
     */
    function Caret() { }
    
    /**
     * Посчитать количество опциональных символов которых нет в значении в определенном диапазоне
     * @param optionals
     * @param shift
     * @return {int}
     */
    Caret.prototype.getOptionalSymbolsCount = function(optionals, shift) {
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
    Caret.prototype.positioveOrZero = function (val) {
        if (val < 0) {
            return 0;
        }
        return val;
    }

    /**
     * Получить позицию каретки
     * @param input
     * @return {CaretData}
     */
    Caret.prototype.getSelectionBounds = function (input) {
        var start, stop;
        var opts = input.maskMatch ? input.maskMatch.optionalSymbols : [];
        var data = new CaretData();

        if (input.domElement.setSelectionRange) {
            start = input.domElement.selectionStart;
            stop = input.domElement.selectionEnd;
        } else {
            throw "not implemented";
        }
        data.original.start = start;
        data.original.stop = stop;
        data.start = this.positioveOrZero(start - this.getOptionalSymbolsCount(opts, start));
        data.stop = this.positioveOrZero(stop - this.getOptionalSymbolsCount(opts, stop));
        return data;
    };
    
    /**
     * Установить положение каретки
     * TODO: проверить под всеми браузерами
     * @param input
     * @param position
     */
    Caret.prototype.setPosition = function (input, position) {
        if (input.domElement.setSelectionRange) {
            input.domElement.focus();
            input.domElement.setSelectionRange(position, position);
        } else if (this.domElement.createTextRange) {
            var range = input.domElement.createTextRange();
            
            range.collapse(true);
            range.moveEnd('character', position);
            range.moveStart('character', position);
            range.select();
        }
    }

    /**
     * Получить выделенный текст
     * @return {Object}
     */
    Caret.prototype.getSelectionValue = function () {
        var text = '';
        
        if (window.getSelection) {
            text = window.getSelection().toString()
        } else {
            throw "not implemented";
        }
        return text;
    }

    //#endregion

    //#endregion
    
    //#region ParsedMaskMatch and ParsedMask

    //#region ParsedMaskMatch

    /**
     * Результат поиска маски
     * @param text
     * @param maskedText
     * @param optionalSymbols
     * @param mask
     */
    function ParsedMaskMatch(text, maskedText, optionalSymbols, mask) {
        this.text = text;
        this.maskedText = maskedText;
        this.optionalSymbols = optionalSymbols;
        this.mask = mask;
    }

    /**
     * Исходный текст
     * @var {string?}
     */
    ParsedMaskMatch.prototype.text = null;

    /**
     * Текст с наложенной маской
     * @var {string?}
     */
    ParsedMaskMatch.prototype.maskedText = null;

    /**
     * Список опциональных символов в {maskedText}
     * @var {array}
     */
    ParsedMaskMatch.prototype.optionalSymbols = null;

    /**
     * Ссылка на маску
     * @var {ParsedMask}
     */
    ParsedMaskMatch.prototype.mask = null;

    //#endregion

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
     * Форматируем маску
     * @var text
     */
    ParsedMask.prototype.printf = function (text) { 
        return text;
    }

    /**
     * Заполнитьмаску
     * @param text
     * @return {ParsedMaskMatch?}
     */
    ParsedMask.prototype.try = function (text) {
        var result = '';
        var optionals = [];
        var source = text;
        
        if (text.length) {
            // текст есть - маскируем его
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
        }
        return new ParsedMaskMatch(source, result, optionals, this);
    }

    //#endregion
    
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
     * @return {ParsedMaskMatch?}
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
        this.caret = new Caret(this);
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
     * Хэлпер раблоты с указателем
     * @var {Caret}
     */
    MaskedInput.prototype.caret = null;

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
     * @var {ParsedMaskMatch?}
     */
    MaskedInput.prototype.maskMatch = null;
    
    /**
     * Последнее "выделение"
     * @var {CaretData?}
     */
    MaskedInput.prototype.caretData = null;

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
                text: that.caret.getSelectionValue()
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
     * @return {ParsedMaskMatch?}
     */
    MaskedInput.prototype.findMaskMatch = function (text) {
        for (var i = 0; i < this.masks.length; ++i) {
            var match = this.masks[i].try(text);

            if (match) {
                return match;
            }
        }
        return null;
    }
    
    /**
     * Применить значение маски к инпуту
     * @param maskMatch
     * @param action
     */
    MaskedInput.prototype.applyMaskValue = function (maskMatch, action) {
        var value = maskMatch.maskedText;
        var position = null;

        switch (action.action) {
            case this.actions.SET_TEXT:
            case this.actions.INSERT_TEXT:
                if (this.caretData.original.start == this.domElement.value.length) {
                    // вставляем данные в конец текста
                    position = maskMatch.maskedText.length;
                } else {
                    // вставляем данные в середину текста
                    // получаем сроку, которая идет перед кареткой и накладываем на нее маску - длина получившегося значения и будет положение каретки
                    position = this.maskMatch.mask.try(this.value.substr(0, this.caretData.start + action.text.length)).maskedText.length;
                }

                break;
            case this.actions.DELETE_PREVIOUS:
                if ((this.caretData.stop - this.caretData.start) <= 1) {
                    // удаление без выделения - нужно сдвинуть на один символ
                    // если удаляли с выделением - нужно оставить каретку на месте
                    position = this.maskMatch.mask.try(this.value.substr(0, this.caretData.start - 1)).maskedText.length;
                }
                break;
        }
        this.domElement.value = value;
        if (position !== null) {
            this.caret.setPosition(this, position);
        } else {
            this.caret.setPosition(this, this.caretData.original.start);
        }
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
            var maskMatch = this.findMaskMatch(value);
            
            if (e) {
                e.preventDefault();
            }
            if (maskMatch) {
                this.value = value;
                this.maskMatch = maskMatch;
                this.applyMaskValue(maskMatch, action);
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
        var bound = this.caret.getSelectionBounds(this);
        var value = '';
        
        this.caretData = bound;
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
    
    //#endregion

    return MaskedInput;

})();