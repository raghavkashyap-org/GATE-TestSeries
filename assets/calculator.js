(function () {
  var CSS_HREF = "/assets/calculator.css";
  var ICON_HREF = "/assets/calculator-icon.png";
  var STYLE_ATTR = "data-bijzli-calc-style";
  var ROOT_ID = "bijzliCalcRoot";
  var PANEL_ID = "bijzliCalcPanel";
  var STORAGE_KEY = "bijzli-calc-state-v2";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function ensureStyles() {
    if (document.querySelector("link[" + STYLE_ATTR + "]")) {
      return;
    }

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    link.setAttribute(STYLE_ATTR, "true");
    document.head.appendChild(link);
  }

  function inferTheme() {
    var body = document.body;
    var html = document.documentElement;
    var candidates = [
      body && body.getAttribute("data-theme"),
      html && html.getAttribute("data-theme")
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      var value = String(candidates[i] || "").toLowerCase();
      if (value === "green") return "green";
      if (value === "dark") return "dark";
      if (value === "light" || value === "bright") return "bright";
    }

    if ((body && body.classList.contains("theme-dark")) || (html && html.classList.contains("theme-dark"))) {
      return "dark";
    }

    return "bright";
  }

  function createMarkup() {
    var wrapper = document.createElement("div");
    wrapper.className = "bijzli-calc";
    wrapper.id = ROOT_ID;
    wrapper.setAttribute("data-theme", inferTheme());
    wrapper.innerHTML = [
      '<button class="bijzli-calc-fab" id="bijzliCalcFab" type="button" aria-label="Open calculator" title="Scientific Calculator">',
      '  <span class="bijzli-calc-fab-icon" aria-hidden="true"><img src="' + ICON_HREF + '" alt="" loading="eager" decoding="async"></span>',
      "</button>",
      '<div class="bijzli-calc-panel" id="' + PANEL_ID + '" role="dialog" aria-label="Scientific calculator" aria-hidden="true">',
      '  <div class="bijzli-calc-titlebar" id="bijzliCalcTitlebar">',
      '    <span class="bijzli-calc-title-name">Scientific Calculator</span>',
      '    <button class="bijzli-calc-close" type="button" data-bijzli-action="toggle" aria-label="Close calculator">&times;</button>',
      "  </div>",
      '  <div class="bijzli-calc-display">',
      '    <div class="bijzli-calc-display-top">',
      '      <input class="bijzli-calc-expr" id="bijzliCalcExpr" type="text" value="" readonly>',
      '      <span class="bijzli-calc-memory" id="bijzliCalcMemoryLabel" hidden>M</span>',
      "    </div>",
      '    <input class="bijzli-calc-main" id="bijzliCalcMain" type="text" value="0" readonly>',
      "  </div>",
      '  <div class="bijzli-calc-controls">',
      '    <button class="bijzli-calc-mem-btn" type="button" data-bijzli-action="op" data-value="mod">mod</button>',
      '    <div class="bijzli-calc-angle-group">',
      '      <label><input type="radio" name="bijzliCalcAngle" value="deg" checked> Deg</label>',
      '      <label><input type="radio" name="bijzliCalcAngle" value="rad"> Rad</label>',
      "    </div>",
      '    <div class="bijzli-calc-spacer"></div>',
      '    <button class="bijzli-calc-mem-btn" type="button" data-bijzli-action="mem" data-value="mc">MC</button>',
      '    <button class="bijzli-calc-mem-btn" type="button" data-bijzli-action="mem" data-value="mr">MR</button>',
      '    <button class="bijzli-calc-mem-btn" type="button" data-bijzli-action="mem" data-value="ms">MS</button>',
      '    <button class="bijzli-calc-mem-btn" type="button" data-bijzli-action="mem" data-value="m+">M+</button>',
      '    <button class="bijzli-calc-mem-btn" type="button" data-bijzli-action="mem" data-value="m-">M-</button>',
      "  </div>",
      '  <div class="bijzli-calc-grid">',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="sinh">sinh</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="cosh">cosh</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="tanh">tanh</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="expfmt">Exp</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="inv">1/x</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="abs">|x|</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-danger bijzli-calc-span-2" type="button" data-bijzli-action="del">&larr;</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-danger" type="button" data-bijzli-action="ac">C</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-danger" type="button" data-bijzli-action="fn" data-value="neg">+/-</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="sqrt">sqrt</button>',

      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="asinh">sinh<sup>-1</sup></button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="acosh">cosh<sup>-1</sup></button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="atanh">tanh<sup>-1</sup></button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="log2">log<sub>2</sub>x</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="ln">ln</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="log">log</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-num" type="button" data-bijzli-action="digit" data-value="7">7</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-num" type="button" data-bijzli-action="digit" data-value="8">8</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-num" type="button" data-bijzli-action="digit" data-value="9">9</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="op" data-value="/">/</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="op" data-value="mod">%</button>',

      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="const" data-value="pi">&pi;</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="const" data-value="e">e</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="fact">n!</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="op" data-value="logy">log<sub>y</sub>x</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="ex">e<sup>x</sup></button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="tenpow">10<sup>x</sup></button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-num" type="button" data-bijzli-action="digit" data-value="4">4</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-num" type="button" data-bijzli-action="digit" data-value="5">5</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-num" type="button" data-bijzli-action="digit" data-value="6">6</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="op" data-value="*">*</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="inv">1/x</button>',

      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="sin">sin</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="cos">cos</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="tan">tan</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="op" data-value="**">x<sup>y</sup></button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="cube">x<sup>3</sup></button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="sq">x<sup>2</sup></button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-num" type="button" data-bijzli-action="digit" data-value="1">1</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-num" type="button" data-bijzli-action="digit" data-value="2">2</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-num" type="button" data-bijzli-action="digit" data-value="3">3</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="op" data-value="-">-</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-equals bijzli-calc-span-v-2" type="button" data-bijzli-action="eq">=</button>',

      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="asin">sin<sup>-1</sup></button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="acos">cos<sup>-1</sup></button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="atan">tan<sup>-1</sup></button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="op" data-value="root">y&#8730;x</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="cbrt">&#8731;x</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="fn" data-value="abs">abs</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-num bijzli-calc-span-2" type="button" data-bijzli-action="digit" data-value="0">0</button>',
      '    <button class="bijzli-calc-key bijzli-calc-key-num" type="button" data-bijzli-action="dot">.</button>',
      '    <button class="bijzli-calc-key" type="button" data-bijzli-action="op" data-value="+">+</button>',
      "  </div>",
      "</div>"
    ].join("");
    document.body.appendChild(wrapper);
    return wrapper;
  }

  function readStoredState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_error) {
      return {};
    }
  }

  function writeStoredState(nextState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (_error) {
      // Storage is optional.
    }
  }

  ready(function initCalculator() {
    ensureStyles();

    var root = document.getElementById(ROOT_ID) || createMarkup();
    if (root.getAttribute("data-bijzli-init") === "true") {
      return;
    }
    root.setAttribute("data-bijzli-init", "true");

    var panel = root.querySelector("#" + PANEL_ID);
    if (panel && panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }

    var stored = readStoredState();
    var state = {
      open: false,
      angle: stored.angle === "rad" ? "rad" : "deg",
      display: "0",
      expr: "",
      op1: null,
      operator: null,
      newNumber: true,
      memValue: 0,
      hasMemory: false,
      panelDragged: false
    };

    var els = {
      root: root,
      fab: root.querySelector("#bijzliCalcFab"),
      panel: panel,
      titlebar: panel.querySelector("#bijzliCalcTitlebar"),
      expr: panel.querySelector("#bijzliCalcExpr"),
      main: panel.querySelector("#bijzliCalcMain"),
      memoryLabel: panel.querySelector("#bijzliCalcMemoryLabel"),
      angleInputs: Array.prototype.slice.call(panel.querySelectorAll('input[name="bijzliCalcAngle"]'))
    };

    function syncTheme() {
      var theme = inferTheme();
      els.root.setAttribute("data-theme", theme);
      els.panel.setAttribute("data-theme", theme);
    }

    function findDockTarget() {
      var timer = document.querySelector("#gateTimerBox, .gate-timer-box, #timerWrap");
      if (timer && timer.parentElement) {
        var container = timer.parentElement;
        var className = String(container.className || "");
        if (className.indexOf("gate-header-right") !== -1 || className.indexOf("controls") !== -1) {
          return {
            type: "header",
            timer: timer,
            container: container
          };
        }
      }

      var questionArea = document.querySelector(".gate-question-area");
      if (questionArea) {
        return {
          type: "question",
          container: questionArea
        };
      }

      return null;
    }

    function positionPanel(forceReset) {
      if (!els.panel) {
        return;
      }

      var layout = root.getAttribute("data-layout");
      if (layout !== "header" && layout !== "question") {
        els.panel.style.top = "";
        els.panel.style.left = "";
        els.panel.style.right = "";
        els.panel.style.bottom = "";
        return;
      }

      if (state.panelDragged && !forceReset) {
        return;
      }

      var rect = root.getBoundingClientRect();
      var width = Math.min(780, Math.max(320, window.innerWidth - 24));
      var top = Math.max(10, Math.round(rect.bottom + 10));
      var left;

      if (window.matchMedia("(max-width: 760px)").matches) {
        left = 8;
        width = Math.min(window.innerWidth - 16, width);
      } else {
        left = Math.round(rect.right - width);
        left = Math.max(10, Math.min(window.innerWidth - width - 10, left));
      }

      els.panel.style.width = width + "px";
      els.panel.style.top = top + "px";
      els.panel.style.left = left + "px";
      els.panel.style.right = "auto";
      els.panel.style.bottom = "auto";
    }

    function applyDockLayout() {
      var target = findDockTarget();
      if (!target) {
        root.setAttribute("data-layout", "floating");
        if (root.parentElement !== document.body) {
          document.body.appendChild(root);
        }
        positionPanel(true);
        return false;
      }

      if (target.type === "question") {
        var dock = target.container.querySelector(".bijzli-calc-question-dock");
        if (!dock) {
          dock = document.createElement("div");
          dock.className = "bijzli-calc-question-dock";
          var infoBar = target.container.querySelector(".gate-q-info");
          if (infoBar && infoBar.nextSibling) {
            target.container.insertBefore(dock, infoBar.nextSibling);
          } else if (infoBar) {
            target.container.appendChild(dock);
          } else {
            target.container.insertBefore(dock, target.container.firstChild);
          }
        }

        if (root.parentElement !== dock) {
          dock.appendChild(root);
        }

        root.setAttribute("data-layout", "question");
        positionPanel(true);
        return true;
      }

      var stack = target.container.querySelector(".bijzli-calc-header-stack");
      if (!stack) {
        stack = document.createElement("div");
        stack.className = "bijzli-calc-header-stack";
        target.container.insertBefore(stack, target.timer.nextSibling);
      }

      if (root.parentElement !== stack) {
        stack.appendChild(root);
      }

      root.setAttribute("data-layout", "header");
      positionPanel(true);
      return true;
    }

    function formatNumber(value) {
      if (typeof value === "string") {
        return value;
      }
      if (!Number.isFinite(value)) {
        return "Error";
      }
      return String(parseFloat(Number(value).toPrecision(12)));
    }

    function currentNumber() {
      return parseFloat(state.display);
    }

    function saveState() {
      writeStoredState({
        angle: state.angle
      });
    }

    function refresh() {
      els.main.value = state.display;
      els.expr.value = state.expr;
      els.memoryLabel.hidden = !state.hasMemory;
      els.angleInputs.forEach(function (input) {
        input.checked = input.value === state.angle;
      });
    }

    function clearAll() {
      state.display = "0";
      state.expr = "";
      state.op1 = null;
      state.operator = null;
      state.newNumber = true;
      refresh();
    }

    function inputDigit(value) {
      if (state.display === "Error") {
        clearAll();
      }

      if (state.newNumber) {
        state.display = String(value);
        state.newNumber = false;
      } else if (state.display === "0" && value !== ".") {
        state.display = String(value);
      } else {
        state.display += String(value);
      }

      refresh();
    }

    function inputDot() {
      if (state.newNumber) {
        state.display = "0.";
        state.newNumber = false;
      } else if (state.display.indexOf(".") === -1) {
        state.display += ".";
      }
      refresh();
    }

    function deleteLast() {
      if (state.newNumber || state.display === "Error") {
        state.display = "0";
        state.newNumber = false;
      } else if (state.display.length > 1) {
        state.display = state.display.slice(0, -1);
      } else {
        state.display = "0";
      }
      refresh();
    }

    function toRadians(value) {
      return state.angle === "deg" ? value * Math.PI / 180 : value;
    }

    function fromRadians(value) {
      return state.angle === "deg" ? value * 180 / Math.PI : value;
    }

    function factorial(value) {
      if (!Number.isFinite(value) || value < 0 || Math.floor(value) !== value || value > 170) {
        return NaN;
      }

      var result = 1;
      for (var i = 2; i <= value; i += 1) {
        result *= i;
      }
      return result;
    }

    function operatorLabel(operator) {
      switch (operator) {
        case "+":
        case "-":
        case "*":
        case "/":
          return operator;
        case "**":
          return "^";
        case "mod":
          return "mod";
        case "logy":
          return "logy";
        case "root":
          return "yroot";
        default:
          return operator;
      }
    }

    function applyBinary(a, operator, b) {
      switch (operator) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return b !== 0 ? a / b : NaN;
        case "**":
          return Math.pow(a, b);
        case "mod":
          return b !== 0 ? a % b : NaN;
        case "logy":
          return a > 0 && b > 0 && b !== 1 ? Math.log(a) / Math.log(b) : NaN;
        case "root":
          return a !== 0 ? Math.pow(b, 1 / a) : NaN;
        default:
          return NaN;
      }
    }

    function finishUnary(label, result) {
      state.expr = label;
      state.display = formatNumber(result);
      state.newNumber = true;
      refresh();
    }

    function applyFunction(fnName) {
      var current = currentNumber();
      var result = NaN;
      var label = fnName + "(" + formatNumber(current) + ")";

      switch (fnName) {
        case "sin":
          result = Math.sin(toRadians(current));
          break;
        case "cos":
          result = Math.cos(toRadians(current));
          break;
        case "tan":
          result = Math.tan(toRadians(current));
          break;
        case "asin":
          result = current >= -1 && current <= 1 ? fromRadians(Math.asin(current)) : NaN;
          break;
        case "acos":
          result = current >= -1 && current <= 1 ? fromRadians(Math.acos(current)) : NaN;
          break;
        case "atan":
          result = fromRadians(Math.atan(current));
          break;
        case "sinh":
          result = Math.sinh(current);
          break;
        case "cosh":
          result = Math.cosh(current);
          break;
        case "tanh":
          result = Math.tanh(current);
          break;
        case "asinh":
          result = Math.asinh(current);
          break;
        case "acosh":
          result = current >= 1 ? Math.acosh(current) : NaN;
          break;
        case "atanh":
          result = current > -1 && current < 1 ? Math.atanh(current) : NaN;
          break;
        case "log":
          result = current > 0 ? Math.log10(current) : NaN;
          break;
        case "ln":
          result = current > 0 ? Math.log(current) : NaN;
          break;
        case "log2":
          result = current > 0 ? Math.log2(current) : NaN;
          break;
        case "sqrt":
          result = current >= 0 ? Math.sqrt(current) : NaN;
          break;
        case "cbrt":
          result = Math.cbrt(current);
          break;
        case "inv":
          result = current !== 0 ? 1 / current : NaN;
          break;
        case "fact":
          result = factorial(current);
          break;
        case "ex":
          result = Math.exp(current);
          break;
        case "tenpow":
          result = Math.pow(10, current);
          break;
        case "sq":
          result = current * current;
          break;
        case "cube":
          result = current * current * current;
          break;
        case "abs":
          result = Math.abs(current);
          break;
        case "neg":
          result = -current;
          break;
        case "expfmt":
          state.expr = label;
          state.display = Number.isFinite(current) ? current.toExponential() : "Error";
          state.newNumber = true;
          refresh();
          return;
        default:
          return;
      }

      finishUnary(label, result);
    }

    function setConstant(name) {
      state.display = name === "pi" ? formatNumber(Math.PI) : formatNumber(Math.E);
      state.newNumber = false;
      refresh();
    }

    function applyMemory(command) {
      switch (command) {
        case "mc":
          state.memValue = 0;
          state.hasMemory = false;
          break;
        case "mr":
          state.display = formatNumber(state.memValue);
          state.newNumber = false;
          break;
        case "ms":
          state.memValue = currentNumber() || 0;
          state.hasMemory = true;
          break;
        case "m+":
          state.memValue += currentNumber() || 0;
          state.hasMemory = true;
          break;
        case "m-":
          state.memValue -= currentNumber() || 0;
          state.hasMemory = true;
          break;
        default:
          break;
      }

      refresh();
    }

    function applyOperator(operator) {
      if (state.display === "Error") {
        clearAll();
        return;
      }

      var current = currentNumber();
      if (!Number.isFinite(current)) {
        return;
      }

      if (state.op1 !== null && state.operator && !state.newNumber) {
        var chained = applyBinary(state.op1, state.operator, current);
        state.op1 = parseFloat(formatNumber(chained));
        state.display = formatNumber(chained);
      } else {
        state.op1 = current;
      }

      state.operator = operator;
      state.newNumber = true;
      state.expr = formatNumber(state.op1) + " " + operatorLabel(operator);
      refresh();
    }

    function calculateEquals() {
      if (state.op1 === null || state.operator === null || state.newNumber) {
        return;
      }

      var current = currentNumber();
      var result = applyBinary(state.op1, state.operator, current);
      state.expr = formatNumber(state.op1) + " " + operatorLabel(state.operator) + " " + formatNumber(current) + " =";
      state.display = formatNumber(result);
      state.op1 = null;
      state.operator = null;
      state.newNumber = true;
      refresh();
    }

    function toggle(forceState) {
      state.open = typeof forceState === "boolean" ? forceState : !state.open;
      els.panel.classList.toggle("is-open", state.open);
      els.panel.setAttribute("aria-hidden", state.open ? "false" : "true");
      els.fab.classList.toggle("is-open", state.open);
      if (state.open) {
        state.panelDragged = false;
        positionPanel(true);
      }
    }

    function handleAction(action, value) {
      switch (action) {
        case "toggle":
          toggle();
          break;
        case "digit":
          inputDigit(value);
          break;
        case "dot":
          inputDot();
          break;
        case "op":
          applyOperator(value);
          break;
        case "eq":
          calculateEquals();
          break;
        case "ac":
          clearAll();
          break;
        case "del":
          deleteLast();
          break;
        case "fn":
          applyFunction(value);
          break;
        case "const":
          setConstant(value);
          break;
        case "mem":
          applyMemory(value);
          break;
        default:
          break;
      }
    }

    function shouldIgnoreKeyboard() {
      var active = document.activeElement;
      if (!active) {
        return false;
      }

      var tagName = active.tagName;
      return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || active.isContentEditable;
    }

    function handleKeydown(event) {
      if (!state.open || shouldIgnoreKeyboard()) {
        return;
      }

      var key = event.key;
      if (key >= "0" && key <= "9") {
        inputDigit(key);
      } else if (key === ".") {
        inputDot();
      } else if (key === "+") {
        applyOperator("+");
      } else if (key === "-") {
        applyOperator("-");
      } else if (key === "*") {
        applyOperator("*");
      } else if (key === "/") {
        applyOperator("/");
      } else if (key === "%") {
        applyOperator("mod");
      } else if (key === "^") {
        applyOperator("**");
      } else if (key === "Enter" || key === "=") {
        calculateEquals();
      } else if (key === "Backspace") {
        deleteLast();
      } else if (key === "Delete") {
        clearAll();
      } else if (key === "Escape") {
        toggle(false);
      } else {
        return;
      }

      event.preventDefault();
    }

    function enableDragging() {
      var dragging = false;
      var pointerId = null;
      var startX = 0;
      var startY = 0;
      var startLeft = 0;
      var startTop = 0;

      function pointerMove(event) {
        if (!dragging || (pointerId !== null && event.pointerId !== pointerId)) {
          return;
        }

        var rect = els.panel.getBoundingClientRect();
        var nextLeft = Math.max(8, Math.min(window.innerWidth - rect.width - 8, startLeft + (event.clientX - startX)));
        var nextTop = Math.max(8, Math.min(window.innerHeight - rect.height - 8, startTop + (event.clientY - startY)));

        els.panel.style.left = nextLeft + "px";
        els.panel.style.top = nextTop + "px";
        els.panel.style.right = "auto";
        els.panel.style.bottom = "auto";
      }

      function pointerUp(event) {
        if (!dragging || (pointerId !== null && event.pointerId !== pointerId)) {
          return;
        }

        dragging = false;
        pointerId = null;
        els.panel.style.transition = "";
      }

      els.titlebar.addEventListener("pointerdown", function (event) {
        if (event.target.closest("button, input, label")) {
          return;
        }
        if (event.button !== undefined && event.button !== 0 && event.pointerType !== "touch") {
          return;
        }

        dragging = true;
        pointerId = event.pointerId;
        state.panelDragged = true;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = els.panel.getBoundingClientRect().left;
        startTop = els.panel.getBoundingClientRect().top;
        els.panel.style.transition = "none";

        if (els.titlebar.setPointerCapture) {
          try {
            els.titlebar.setPointerCapture(event.pointerId);
          } catch (_error) {
            // Pointer capture is optional.
          }
        }

        event.preventDefault();
      });

      document.addEventListener("pointermove", pointerMove);
      document.addEventListener("pointerup", pointerUp);
      document.addEventListener("pointercancel", pointerUp);
    }

    var themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"]
    });
    if (document.body) {
      themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "data-theme"]
      });
    }

    els.fab.addEventListener("click", function () {
      toggle();
    });

    els.panel.addEventListener("click", function (event) {
      var button = event.target.closest("[data-bijzli-action]");
      if (!button) {
        return;
      }

      handleAction(button.getAttribute("data-bijzli-action"), button.getAttribute("data-value"));
    });

    els.panel.addEventListener("change", function (event) {
      if (event.target.name !== "bijzliCalcAngle") {
        return;
      }

      state.angle = event.target.value === "rad" ? "rad" : "deg";
      saveState();
      refresh();
    });

    document.addEventListener("keydown", handleKeydown);
    enableDragging();
    applyDockLayout();

    if (document.body) {
      var dockObserver = new MutationObserver(function () {
        if (applyDockLayout()) {
          dockObserver.disconnect();
        }
      });
      dockObserver.observe(document.body, {
        childList: true,
        subtree: true
      });

      window.addEventListener("bijzli:exam-layout-ready", function () {
        if (applyDockLayout()) {
          dockObserver.disconnect();
        }
      });
    }

    window.addEventListener("resize", function () {
      applyDockLayout();
      if (state.open) {
        positionPanel(false);
      }
    });

    syncTheme();
    refresh();

    window.toggleBijzliCalculator = function () {
      toggle();
    };
  });
})();
