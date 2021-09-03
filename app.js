Vue.config.devtools = true

Vue.component("form-table-paginate", {
  template: "#form-table-paginate-template",
  props: {
    paginate: {type: Object, required: true}
  },
  methods: {
    changePage(page, action) {
      this.$emit("change-page", page, action);
    }
  }
});

Vue.component("form-table", {
  template: "#form-table-template",
  props: {
    nome:                { type: String, required: true    },
    fields:              { type: Array, required: true     },
    itens:               { type: Array, required: true     },
    fnSelecionado:       { type: Function, required: false },
    fnColunaSelecionada: { type: Function, required: false },
    atalhos:             { type: Array, required: false, default: () => []     },
    linhas:              { type: Number, required: false, default: () => 20    },
    onlyRow:             { type: Boolean, required: false, default: () => true },
    hasSelection:        { type: Boolean, required: false, default: () => false},
  },
  data() {
    return {
      colunas:         this.processar(this.fields),
      tableFocused:    false,
      menuShowIndex:   null,
      hoverEl:         null,
      table:           null,
      columnsSelected: { indexes: [] },
      ordering:        { order: null, column: null },
      navigation:      { navigationOn: false, row: 0, column: 0, },
      selecao:         { ativo: false, item: null, linha: 0, coluna: 0 },
      filter:          { hideRows: {}, column: {}, opened: false, allChecked: null },
      resize:          { started: false, colIndex: null, offset: null, width: null },
      paginate:        { pages: 4, active: 1, allPages: null, rightShow: false, currentPageContent: null },
      draggable:       { showIndicator: false, started: false, observer: null, newIndex: null, running: null, indicatorIndex: null, firstClientX: null },
    }
  },
  watch: {
    fields() {
      this.colunas = this.processar(this.fields);
    },
    itens() {
      const rows = Array.from(this.table.querySelectorAll('.form-table-div-row-body, .form-table-div-row-header'));

      if (rows) {
        this.defineRowsMargin()
        this.colunas = this.processar(this.fields);
      }
    }, 
    "paginate.active": function () {
      let currentRegister = (this.paginate.allPages[this.paginate.active - 1][this.navigation.row]);

      this.emitCurrentRegister(currentRegister)
    },
    "filter.opened": function (val) {
      if (!val) {
        this.$set(this.filter, "column", {});
      }
    },
    "navigation.row": function (newValue) {
      let currentRegister = (this.paginate.currentPageContent[newValue]);

      this.emitCurrentRegister(currentRegister)
    },
    "paginate.currentPageContent": function (newValue) {
      this.defineResizePosition();
      this.defineRowsMargin();
    },
  },
  computed: {
    customItems() {
      const {order, column} = this.ordering;
      const {hideRows} = this.filter;
      let items = (this.itens || []).slice();

      if (Object.keys(hideRows).length) {
        items = items.filter((item) => {
          return (Object.keys(item).findIndex(key => hideRows[key] && hideRows[key].includes(this.toSlug(item[key]))) < 0);
        });
      }

      if (order === "asc") {
        items = items.sort((colA, colB) => {
          if (colA[column] < colB[column]) return -1;
          if (colB[column] < colA[column]) return 1;

          return 0;
        });

      } else if (order === "desc") {
        items = items.sort((colA, colB) => {
          if (colA[column] > colB[column]) return -1;
          if (colB[column] > colA[column]) return 1;

          return 0;
        });
      }

      this.returnCurrentPage(items)

      const page = this.paginate.currentPageContent;

      return page;
    },
    filteredItems() {
      const {hideRows, column} = this.filter;
      let items = this.itens.slice();

      if (hideRows[column.key]?.length) {
        items = items.map((item) => {
          item.exists = hideRows[column.key].includes(
            this.toSlug(item[column.key])
          );
          return {...item, checked: !item.exists};
        });
      }

      return items
        .map((item) => ({
          key: item[column.key],
          checked: item.checked === undefined ? true : item.checked,
        }))
        .filter((item, index, self) => {
          return self.map((el) => el.key).indexOf(item.key) === index;
        });
    },
  },
  methods: {
    processar(currentFields) {
      const t = [];
      const fieldsFromStorage = JSON.parse(localStorage.getItem(`form-table-${this.nome}`));

      if(fieldsFromStorage) {
        return fieldsFromStorage;
      }

      let bodyCellsSize = this.fields.map(i => Object.defineProperty({}, i.key, { value: this.itens.filter((j, k) => k < 10).map(j => j[i.key] || '').map(j => String(j)).map(j => j.length).reduce((a, j) => a > j ? a : j, 0) }))
      let headerCellsSize = this.fields.map(i => Object.defineProperty({}, i.key, { value: String(i.key).length}))
      let fieldsNames = bodyCellsSize.map(a => Object.getOwnPropertyNames(a)[0])
      let finalsSizes = fieldsNames.map((o, i) => Object.defineProperty({}, o, { value: bodyCellsSize[i][o] > headerCellsSize[i][o] ? bodyCellsSize[i][o] : headerCellsSize[i][o]}))
      let total = finalsSizes.map((o, i) => o[fieldsNames[i]]).reduce((a, c) =>  a + c, 0)
      let columnsSize = []


      fieldsNames.map((o, i) => columnsSize[o] = parseFloat(((((finalsSizes[i][o] + (total / finalsSizes.length)) / (total * 2))) * 100).toFixed(2))).reduce( (a, i) => a + i)


      currentFields.forEach((i, index) => {
        let k = currentFields.find((j) => j.key === i.key);

        i.style = i.style || {}

        if (k) {
          i.style.width = `calc(${columnsSize[fieldsNames[index]]}%)`
          t.push({...k})
        }
      })

      return t;
    },
    focus() {
      this.$refs['tableComponent'].focus()
      this.$set(this.navigation, 'navigationOn', true)
      this.emitCurrentRegister(this.paginate.currentPageContent[this.navigation.row])
    },
    blur() {
      this.$refs['tableComponent'].blur()
      this.$set(this.navigation, 'navigationOn', false)
    },
    

    keypress(event) {
      let atalho = this.atalhos.find(i => ((!i.alt) === (!event.altkey)) && ((!i.control) === (!event.ctrlKey)) && ((!i.shift) === (!event.shiftKey)) && (event.type === (i.type || 'keyup')) && (i.key === event.key))
      
      if (atalho && atalho.funcao) {
        atalho.funcao(this.paginate.currentPageContent[this.navigation.row], event)

      } else if (!event.altKey && !event.ctrlKey && !event.shiftKey && event.type === 'keydown' && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === ' ')) {

        if (event.key === 'ArrowDown')
          this.moveDown()

        else if (event.key === 'ArrowUp')
          this.moveUp()

        else if (event.key === 'ArrowRight')
          this.moveRight()

        else if (event.key === 'ArrowLeft')
          this.moveLeft()

        event.stopPropagation()

      } else if (this.$parent.keypress) {
        this.$parent.keypress(event)
      }
    },
    moveDown() {
      if (this.navigation.navigationOn && this.onlyRow) {
        let nextRow = this.table?.querySelector('.selected')?.nextElementSibling
        let nextRowIndex = nextRow == null ? this.navigation.row : Number(nextRow.dataset.index)

        this.setNavigation(nextRowIndex, this.navigation.column)
      }
    },
    moveUp() {
      if (this.navigation.navigationOn && this.onlyRow) {
        let nextRow = this.table?.querySelector('.selected')?.previousElementSibling
        let nextRowIndex = nextRow == null ? this.navigation.row : Number(nextRow.dataset.index)

        this.setNavigation(nextRowIndex, this.navigation.column)
      }
    },
    moveRight() {
      if (this.navigation.navigationOn && this.onlyRow) {
        let hasScroll = this.table?.querySelector('.form-table-div-header:last-of-type').getBoundingClientRect().right > this.table.getBoundingClientRect().right;

        if (hasScroll) {
          this.scrolling();

        } else {
          let rowExistInNextPage = (this.paginate.allPages[this.paginate.active]?.length > this.navigation.row)
          let existNextPage = (!!this.paginate.allPages[this.paginate.active])

          if (existNextPage) {
            if (rowExistInNextPage) {
              this.setNavigation(this.navigation.row, 0)
              this.changePage(this.paginate.active, 'increment')
  
            } else {
              let lastResgister = (this.paginate.allPages[this.paginate.active]?.length - 1)
  
              this.setNavigation(lastResgister, 0)
              this.changePage(this.paginate.active, 'increment')
            }
          }
        }
      }
    },
    moveLeft() {
      if (this.navigation.navigationOn && this.onlyRow) {
        let hasScroll = this.table?.querySelector('.form-table-div-header:first-of-type').getBoundingClientRect().left < this.table.getBoundingClientRect().left;

        if (hasScroll) {
          this.scrolling();

        } else {
          let lastColumnIndex = Array.from(this.table?.querySelectorAll('.form-table-div-header')).length - 1;

          this.setNavigation(this.navigation.row, lastColumnIndex)
          this.changePage(this.paginate.active, 'decrement')
        }
      }
    },
    setNavigation(row, column) {
      this.$set(this.navigation, 'row', row);
      this.$set(this.navigation, 'column', column);
    },
    scrolling() {
      console.log('scrolling')
    },

    // to drag columns
    handleStartDraggable() {
      let width = 0;
      let left = 0;
      let top = 0


      this.table.querySelectorAll(".form-table-div-header.column-selected").forEach((el) => {
        if (!left) left = el.offsetLeft;
        width += el.offsetWidth;
        top += el.offsetTop
      });

      const fakeColumn = this.table.querySelector(".draggable-indicator");
      fakeColumn.style.width = `${width}px`;
      fakeColumn.style.left = `${left}px`;
      fakeColumn.style.top = `${top}px`;
      fakeColumn.style.height = `${this.table.offsetHeight - 2}px`;

      this.$set(this.draggable, "started", true);
      this.$set(this.draggable, "showIndicator", true);

      const maxRight = this.table.getBoundingClientRect().right;
      const minLeft = this.table.offsetLeft;

      const observer = new MutationObserver((e) =>
        this.handleObserverMoveColumns(e, minLeft, maxRight)
      );

      observer.observe(fakeColumn, {attributes: true});
      this.$set(this.draggable, "observer", observer);

      document.addEventListener("mousemove", this.handleMoveColumns);
      document.addEventListener("mouseup", this.handleStopDraggable);
    },
    handleObserverMoveColumns(el, minLeft, maxRight) {
      try {
        const target = el[0].target;
        const rect = target.getBoundingClientRect();
        const currentRight = rect.right;

        if (currentRight > maxRight) {
          target.style.left = `${target.offsetLeft - 2}px`;
        } else if (target.offsetLeft < minLeft) {
          target.style.left = `${minLeft}px`;
        }
      } catch (e) {
      }
    },
    handleMoveColumns(e) {
      document.removeEventListener("click", this.handleUnselectColumn)

      const fakeColumn = this.table.querySelector(".draggable-indicator");

      if (!this.draggable.firstClientX) {
        const minusLeft = e.clientX - fakeColumn.offsetLeft;
        this.$set(this.draggable, "firstClientX", minusLeft);
      }

      const mousePosition = e.clientX - this.draggable.firstClientX;
      fakeColumn.style.left = `${mousePosition}px`;
      this.handleIndicatorPosition(fakeColumn);
    },
    handleStopDraggable(e) {
      setTimeout(() => document.addEventListener("click", this.handleUnselectColumn), 500)

      this.draggable.observer.disconnect();
      document.removeEventListener("mousemove", this.handleMoveColumns);
      document.removeEventListener("mouseup", this.handleStopDraggable);

      const newLocation = this.table.querySelector(".new-index-table");

      if (newLocation) {
        let newIndex = parseInt(newLocation.dataset.index);

        if (newLocation.classList.contains("dragging-border-right")) {
          newIndex++;
        }

        const columnsSelected = this.colunas.filter(
          (column) => column.selected
        );

        let columns = [];
        let setted = false;

        this.colunas.forEach((column, key) => {
          if (key === newIndex) {
            setted = true;
            columns = columns.concat(columnsSelected);
          }
          if (!column.selected) {
            columns.push(column);
          }
        });

        if (!setted) columns = columns.concat(columnsSelected);

        this.colunas = columns;

        const newIndexes = columns.reduce((final, current, index) => {
          if (current.selected) final.push(index);
          return final;
        }, []);

        this.$set(this.navigation, 'column', newIndexes)
        this.$set(this, "indexes", newIndexes);
        this.$forceUpdate();
        this.$nextTick(() => this.handleColumnsHiddenAfterDrag());
      }

      this.draggable = {};
      this.removeBorderIndicator();
    },
    handleIndicatorPosition(fakeColumn) {
      const rect = fakeColumn.getBoundingClientRect();
      const elements = document.elementsFromPoint(rect.x, rect.y);console.log(elements)

      if (elements) {
        let cell = elements.find((el) => el.classList.contains('form-table-div-header'));

        if (cell && rect.x !== this.draggable.indicatorIndex) {
          const measures = rect.x - rect.width / 2;
          const measuresCell = cell.getBoundingClientRect();
          let className = null;
          let nextIndex = parseInt(cell.dataset.index);
          const {indexes} = this;
          const min = Math.min(...indexes);
          const max = Math.max(...indexes) + 1;
          const middle = indexes.filter((n) => n !== min && n !== max);
          const classRight = "dragging-border-right";
          const classLeft = "dragging-border-left";

          if (rect.x < this.draggable.indicatorIndex) {
            // drag to left
            className = measures < measuresCell.x ? classLeft : classRight;
            if (nextIndex === max && classLeft === className) nextIndex++;
            if (nextIndex === min && classLeft === className) nextIndex = min;
            if (middle.includes(nextIndex) && classLeft === className)
              nextIndex = min;
          } else {
            if (measures >= measuresCell.x) {
              nextIndex++;
              cell = this.table.querySelector(`.form-table-div-content[data-index="${nextIndex}"]`);
            }

            if (cell) className = classRight;
            if (nextIndex === min || middle.includes(nextIndex))
              nextIndex = max;
          }

          if (className) {
            this.$set(this.draggable, "indicatorIndex", rect.x);
            this.removeBorderIndicator();
            this.table.querySelectorAll(`.form-table-div-content[data-index="${nextIndex}"], .form-table-div-header[data-index="${nextIndex}"]`).forEach((el) => el.classList.add(className, "new-index-table"));
          }
        }
      }
    },
    removeBorderIndicator() {
      this.table.querySelectorAll(".form-table-div-content, .form-table-div-header").forEach((el) =>
        el.classList.remove("dragging-border-left", "dragging-border-right", "new-index-table")
      );
    },

    // resize Columns
    handleDownChangeSize(e, header, colIndex) {
      e.stopPropagation()
      this.$set(this.resize, "colIndex", colIndex);
      this.$set(this.resize, "width", parseFloat((this.table.querySelectorAll('.form-table-div-header')[colIndex].offsetWidth).toFixed(2)));

      const [element] = this.$refs[`resize-${colIndex}`];
      const rect = element.getBoundingClientRect();

      element.classList.add("dragged");
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;

      this.$set(this.resize, "offset", rect.left);

      const body = this.$el.querySelector(".form-table-div-table");

      element.style.setProperty("--dragHeaderHeight", `${body.offsetHeight}px`);

      window.addEventListener("mousemove", this.handleMoveChangeSize);
      window.addEventListener("mouseup", this.handleUpChangeSize);
    },
    handleUpChangeSize(e) {
      const [element] = this.$refs[`resize-${this.resize.colIndex}`];

      element.classList.remove("dragged");
      element.style.left = `auto`;
      element.style.top = `0px`;
      element.style.setProperty("--dragHeaderHeight", `100%`);

      window.removeEventListener("mousemove", this.handleMoveChangeSize);
      window.addEventListener("mouseup", this.handleUpChangeSize);
      this.$nextTick(() => this.definePaginatePosition());
    },
    handleMoveChangeSize(e) {
      const [element] = this.$refs[`resize-${this.resize.colIndex}`];
      const oldOffset = this.resize.offset;
      const oldWidth = this.resize.width;

      const result = e.clientX - oldOffset;
      const newSize = parseFloat((result > 0 ? oldWidth + result : oldWidth - result * -1).toFixed(3));
      const newLeft = result > 0 ? oldOffset + result : oldOffset - result * -1;

      if (50 < newSize) {
        element.style.left = `${newLeft}px`;
        element.style.top = `${element.offsetTop}px`;

        this.$set(this.colunas[this.resize.colIndex].style, "width", `calc(${newSize}px)`);

        localStorage.setItem(`form-table-${this.nome}`, JSON.stringify(this.colunas))
      }
    },
    defineResizePosition() {
      setTimeout(() => {
        if (!!this.table) {
          const resizeEl = this.$el.querySelectorAll('.table-component .form-table-div-header .resize-column');

          resizeEl?.forEach(resize => resize.style.top = "0px")
        }
      }, 100)
    },

    // re-order data
    orderBy(order, column) {
      this.ordering = {order, column};

      this.colunas = this.colunas.map((header) => {
        header.asc = header.key === column && order === "asc";
        header.desc = header.key === column && order === "desc";
        return header;
      });
      this.menuShowIndex = null;
    },
    removeOrderBy() {
      this.colunas = this.colunas.map((header) => {
        header.asc = false;
        header.desc = false;
        return header;
      });

      this.ordering = {order: null, column: null};

      this.menuShowIndex = null;
    },

    // Hide/Show column
    hoverActive(key) {
      return this.hoverEl && this.hoverEl.includes(key) ? "hover" : "";
    },
    hover(key, position) {
      let otherIndex = -1;

      if (position === "left") {
        const otherEl = this.colunas
          .slice(0, key)
          .reverse()
          .find((c, i) => i < key && !c.hide && c.hideRight);
        if (otherEl)
          otherIndex = this.colunas.findIndex((c) => c.key === otherEl.key);
      } else if (this.colunas[key].hideRight) {
        otherIndex = this.colunas.findIndex(
          (c, i) => i > key && !c.hide && c.hideLeft
        );
      }

      const otherPosition = position === "left" ? "right" : "left";
      this.hoverEl = [`${otherIndex}-${otherPosition}`, `${key}-${position}`];
    },
    handleHideColumn(key, column) {
      if (column === this.ordering.column) this.removeOrderBy();

      let keyRight = this.colunas
        .slice(0, key)
        .reverse()
        .findIndex((column) => !column.hide);
      if (keyRight === 0) keyRight = 1;

      let keyLeft = this.colunas.slice(key).findIndex((column) => !column.hide);
      if (keyLeft === 0) keyLeft = 1;

      this.colunas = this.colunas.map((column, idx) => {
        if (key === idx) {
          column.hide = true;
          column.hideLeft = false;
          column.hideRight = false;
        }

        if (keyRight >= 0 && !column.hide && key - keyRight === idx)
          column.hideRight = true;
        if (keyLeft >= 0 && !column.hide && keyLeft + key === idx)
          column.hideLeft = true;
        return column;
      });
    },
    handleShowColumn(key, toLeft) {
      let keyHidden = -1;
      if (toLeft) {
        keyHidden = this.colunas.slice(key).findIndex((column) => column.hide);
      } else {
        keyHidden = this.colunas
          .slice(0, key)
          .reverse()
          .findIndex((column) => column.hide);
      }

      if (keyHidden === 0) keyHidden = 1;
      if (keyHidden >= 0)
        keyHidden = toLeft ? keyHidden + key : key - keyHidden;

      if (keyHidden >= 0) {
        let keysHidden = [keyHidden];
        let extremity = -1;
        const extremityStr = !toLeft ? "hideRight" : "hideLeft";

        while (
          extremity < 0 &&
          keyHidden > 0 &&
          this.colunas.length > keyHidden + 1
          ) {
          keyHidden = toLeft ? keyHidden + 1 : keyHidden - 1;
          if (this.colunas[keyHidden][extremityStr]) extremity = keyHidden;
          else keysHidden.push(keyHidden);
        }

        const keyStr = toLeft ? "hideRight" : "hideLeft";
        this.colunas = this.colunas.map((column, idx) => {
          if (keysHidden.includes(idx)) column.hide = false;
          if (extremity === idx) column[extremityStr] = false;
          if (key === idx) column[keyStr] = false;
          return column;
        });

        this.hoverEl = null;
      }
    },
    handleColumnsHiddenAfterDrag() {
      this.colunas = this.colunas.map((column, key) => {
        column.hideLeft =
          !column.hide && this.colunas[key - 1] && this.colunas[key - 1].hide;
        column.hideRight =
          !column.hide && this.colunas[key + 1] && this.colunas[key + 1].hide;
        return column;
      });
    },

    // Select columns
    handleSelectColumnStarted(e, index) {
      const element = e.target.dataset.index ? e.target : e.target.parentElement;

      if (element?.classList.contains('form-table-div-header')) {
        if (this.indexes.includes(parseInt(index)) && this.hasSelection) {
          this.handleStartDraggable();

        } else {
          this.selectColumn([parseInt(index)], true);
          document.addEventListener("click", this.handleUnselectColumn);
        }
      }
    },
    selectColumn(index, reset) {
      const indexes = reset ? index : [...new Set([...this.indexes, index])];


      this.colunas = this.colunas.map((column, key) => {
        column.selected = indexes.includes(key) || (key > Math.min(...indexes) && key < Math.max(...indexes));

        return column;
      });

      this.$set(this.navigation, 'column', indexes[0])

      this.$set(this, "hasSelection", true);
      this.$set(this, "indexes", indexes);
    },
    handleUnselectColumn(e) {
      if (this.indexes.length) {
        if (!e.target.closest("div.form-table-div-header")) {
          this.colunas = this.colunas.map((column) => {
            column.selected = false;

            return column;
          });
          document.removeEventListener("click", this.handleUnselectColumn);
          this.$set(this, "indexes", []);
          this.$set(this, "hasSelection", false);
        }
      }
    },

    // Menu
    handleShowMenu(e, colIndex) {
      e.stopPropagation()
      e.preventDefault()
      if (colIndex === this.menuShowIndex) colIndex = null;

      if (colIndex !== null) {
        let el = e.target.closest("div.form-table-div-header");
        let dropdownEl = document.querySelectorAll('.table-component .dropdown-filter-menu')[colIndex];
        let rightPosition = el.offsetLeft + el.offsetWidth;

        dropdownEl.style.left = rightPosition - dropdownEl.offsetWidth - 162 + 'px';

        if (parseInt(dropdownEl.style.left.split('p')[0]) < 0 ) {
          dropdownEl.style.left = 0;
        }
      }

      this.menuShowIndex = colIndex;
    },

    // filter
    filterColumn(column) {
      this.$set(this.filter, "column", column);
      this.$set(this.filter, "allChecked", !this.filter.hideRows[column.key]);
      this.$set(this.filter, "opened", true);
    },
    closeModalFilter() {
      this.$set(this.filter, "opened", false);
    },
    applyFilters() {
      const hide = [];

      this.$refs.modalFiltersBody.querySelectorAll("input:not(.all):not(:checked)").forEach((input) => {
        hide.push(input.value);
      });

      this.$set(this.filter.hideRows, this.filter.column.key, hide.length ? hide : null);

      setTimeout(() => {
        if (this.paginate.currentPageContent === undefined) this.changePage(this.paginate.allPages.indexOf(this.paginate.allPages[this.paginate.allPages.length - 1]) + 1)
      }, 10)

      this.$set(this.navigation, 'row', 0)
      this.$set(this.navigation, 'cell', 0)
      this.$set(this.selectedRow, 'row', 0)

      this.closeModalFilter();
    },
    toSlug(text) {
      return `${text}`
        .toLowerCase()
        .replace(/[^\w ]+/g, "")
        .replace(/ +/g, "-");
    },
    checkAll(isAll) {
      const allChecked = isAll ? !this.filter.allChecked : this.$refs.modalFiltersBody.querySelectorAll("input:not(.all):not(:checked)").length === 0;

      if (allChecked) {
        this.$refs.modalFiltersBody.querySelectorAll("input:not(.all):not(:checked)").forEach((input) => (input.checked = true));

      } else if (isAll) {
        this.$refs.modalFiltersBody.querySelectorAll('input[type="checkbox"]:not(.all)').forEach((input) => (input.checked = false));
      }

      this.$set(this.filter, "allChecked", allChecked);
    },

    // Pagination
    changePage(page, action) {

      if (action && action === "increment" && this.paginate.active < this.paginate.pages) {
        page++

      } else if (action && action === "decrement" && (this.paginate.active - 1) > 0) {
        page--

      }

      if (page !== this.paginate.active) this.$set(this.paginate, "active", page);


    },
    definePaginatePosition() {
      const componentWidth = this.table?.parentElement.offsetWidth;

      if (componentWidth < window.innerWidth) {
        this.$set(this.paginate, "rightShow", false);

        this.$nextTick(() => {
          const paginateControl = this.$refs.paginateControlComponent.$refs.paginateControl;
          const percentWidth = ((paginateControl.offsetWidth / componentWidth) * 100) / 2;
          paginateControl.style.left = 100 - percentWidth.toFixed(2) + "%";
        });
      } else {
        this.$set(this.paginate, "rightShow", true);
      }
    },
    returnCurrentPage(items) {

      let allPages = [[]];
      let page = 0;

      for (let i = 0; i < items.length; i++) {
        if (allPages[page] === undefined) {
          allPages[page] = [];
        }

        allPages[page].push(items[i]);

        if ((i + 1) % this.linhas === 0) page = page + 1
      }

      let syncronizePagesIndex = this.paginate.active - 1;

      this.$set(this.paginate, 'pages', allPages.length);

      this.$set(this.paginate, 'allPages', allPages);

      this.$set(this.paginate, 'currentPageContent', allPages[syncronizePagesIndex]);
    },

    defineRowsMargin() {
      if (this.table) {
        const rows = Array.from(this.table?.querySelectorAll('.form-table-div-row-body, .form-table-div-row-header'));

        rows.forEach( k => {
          k.style.marginBottom = `${-(k.offsetHeight - k.children[0].offsetHeight)}px`
        })
      }
    },

    emitCurrentRegister(value) {
      this.$emit('input', value)
    },

    // Table start
    afterTableMounted() {
      this.$nextTick(() => {
        const table = this.$refs.tableComponent;

        if (table) {
          const rows = Array.from(table.querySelectorAll('.form-table-div-row-body, .form-table-div-row-header'));

          if (rows) {
            setTimeout(() => this.defineRowsMargin(), 50)
          }

          this.table = table;
          this.definePaginatePosition();
        } else {
          console.log("Table not started");
        }
      });

      this.$nextTick(() => {
        this.defineResizePosition();
      });
    },


  },
  created() {
    /* this.setarAtalho(); */
  },
  mounted() {
    this.afterTableMounted();
  }
});

const vm = new Vue({
  el: "#app",
  data: {
    registros: {
      colunas: [
        { key: "id", label: "Id" },
        { key: "nome", label: "Nome" },
        { key: "sobrenome", label: "Sobrenome" },
        { key: "nascimento", label: "Nascimento" },
        { key: "texto", label: "Texto" },
        { key: "data", label: "Data" },
        { key: "procedimento", label: "Procedimento" },
        { key: "conclusao", label: "Conlusão" },
        { key: "descricao", label: "Descrição" },
      ],
      itens: [
        {
          id: 1,
          nome: "l",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Sampaio",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 2,
          nome: "i",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Pereira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Todos",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 3,
          nome: "p",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Vieira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Nenhum",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 4,
          nome: "7",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Kallyo",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Parcial",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 1,
          nome: "u",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Sampaio",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 2,
          nome: "i",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Pereira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Todos",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 3,
          nome: ";",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Vieira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Nenhum",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 4,
          nome: "Marcelo",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Kallyo",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Parcial",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 1,
          nome: "Daniel",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Sampaio",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 2,
          nome: "Lucas",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Pereira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Todos",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 3,
          nome: "Fernando",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Vieira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Nenhum",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 4,
          nome: "Marcelo",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Kallyo",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Parcial",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 1,
          nome: "Daniel",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Sampaio",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 2,
          nome: "Lucas",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Pereira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Todos",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 3,
          nome: "Fernando",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Vieira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Nenhum",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 4,
          nome: "Marcelo",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Kallyo",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Parcial",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 1,
          nome: "Daniel",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Sampaio",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 2,
          nome: "Lucas",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Pereira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Todos",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 3,
          nome: "Fernando",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Vieira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Nenhum",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 4,
          nome: "Marcelo",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Kallyo",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Parcial",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 1,
          nome: "fd",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Sampaio",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 2,
          nome: "er",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Pereira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Todos",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 3,
          nome: "tr",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Vieira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Nenhum",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 4,
          nome: "gf",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Kallyo",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Parcial",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 1,
          nome: "h",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Sampaio",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 2,
          nome: "u",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Pereira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Todos",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 3,
          nome: "Feroinando",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Vieira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Nenhum",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 4,
          nome: "oi",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Kallyo",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Parcial",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 1,
          nome: "lk",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Sampaio",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 2,
          nome: "mn",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Pereira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Todos",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 3,
          nome: "q",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Vieira",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Nenhum",
          conclusao: "Todos os procedimentos concluídos",
        },
        {
          id: 4,
          nome: "w",
          descricao: "Um simples teste de tamanho",
          sobrenome: "Kallyo",
          nascimento: "03/12/2001",
          texto: "Um pequeno passo para o homem, mas um grande salto para humanidade",
          data: "07/09",
          procedimento: "Parcial",
          conclusao: "Todos os procedimentos concluídos",
        },


      ],
    },
    atalhos: [{key: 16 }, {key: 17}], //passar 16 shift ou 17 ctrl ou []
  },
  methods: {},
  mounted() {},
});
