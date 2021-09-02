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

const SHIFT_CODE = 16;
const CONTROL_CODE = 17;

Vue.component("form-table", {
  template: "#form-table-template",
  props: {
    nome: {type: String, required: true},
    fields: {type: Array, required: true},
    itens: {type: Array, required: true},
    linhas: {type: Number, required: false, default: () => 20},
    fnSelecionado: {type: Function, required: false},
    fnColunaSelecionada: {type: Function, required: false},
    atalhos: { type: Array}
  },
  data() {
    return {
      colunas: this.processar(this.fields),
      selecao: {ativo: false, item: null, linha: 0, coluna: 0},
      draggable: {showIndicator: false, started: false, observer: null, newIndex: null, running: null, indicatorIndex: null, firstClientX: null},
      resize: {started: false, colIndex: null, offset: null, width: null},
      columnsSelected: {indexes: [], hasSelection: false},
      ordering: {order: null, column: null},
      filter: {hideRows: {}, column: {}, opened: false, allChecked: null},
      paginate: {pages: 4, active: 1, allPages: null, rightShow: false, currentPageContent: null},
      selectedCell: {row: 0, column: 0, initNavigation: false},
      selectedRow: {row: 0, onlyRow: true},
      tableFocused: false,
      menuShowIndex: null,
      hoverEl: null,
      table: null,
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
    "filter.opened": function (val) {
      if (!val) {
        this.$set(this.filter, "column", {});
      }
    },
    "paginate.currentPageContent": function () {
      const currentSelectedCell = document.querySelector('.selected-cell');
      const currentSelectedColumn = document.querySelector('.column-selected');
      const sliderEl = this.$refs.tableComponent;

      this.defineResizePosition();
      this.defineRowsMargin();

      if (this.selectedCell.initNavigation && !this.selectedRow.onlyRow && !this.columnsSelected.hasSelection) {

        if (currentSelectedCell?.getBoundingClientRect().left < sliderEl?.getBoundingClientRect().left) this.scrollTo(currentSelectedCell, sliderEl, "left");


        if (currentSelectedCell?.getBoundingClientRect().right >  sliderEl?.getBoundingClientRect().right) this.scrollTo(currentSelectedCell, sliderEl, "right");

      } else if (this.selectedCell.initNavigation && this.selectedRow.onlyRow && this.columnsSelected.hasSelection) {

        if (currentSelectedColumn?.getBoundingClientRect().left < sliderEl?.getBoundingClientRect().left) this.scrollTo(currentSelectedColumn, sliderEl, "left");


        if (currentSelectedColumn?.getBoundingClientRect().right >  sliderEl?.getBoundingClientRect().right) this.scrollTo(currentSelectedColumn, sliderEl, "right");

      }


    }

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
    focus() {
      this.$refs['']
    },
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
          i.style.textAlign = index === 0 ? 'right' : 'left'
          t.push({...k})
        }
      })

      return t;
    },

    // navigation
    habilitaEventos() {
      this.$el.onfocus = e => {
        this.$el.onkeydown = e => {
          (!this.tableFocused && this.paginate.pages > 1) && this.navegacaoDePaginas(e)
        }
      }

      this.table.onfocus = e => {
        this.$set(this.selectedCell, 'initNavigation', true)
        this.tableFocused = true
        this.disableScroll()

        this.table.onkeydown = e => {
          if (this.tableFocused && this.paginate.currentPageContent.length != 0) {

            this.navegacaoDeCelulas(e)
            this.navegacaoDeLinhas(e)
          }
        }

        this.table.onblur = e => {
          this.$set(this.selectedCell, 'initNavigation', false)
          this.$set(this.columnsSelected, 'hasSelection', false)
          this.tableFocused = false
          this.enableScroll()
        }
      }
    },
    setarAtalho() {
        if (this.atalhos.find(a => a.key === SHIFT_CODE))
            this.$set(this.selectedRow, 'onlyRow', !this.selectedRow.onlyRow)

        if (this.atalhos.find(a => a.key === CONTROL_CODE)) {
            this.$set(this.columnsSelected, 'hasSelection', !this.columnsSelected.hasSelection)

            if (this.columnsSelected.hasSelection) this.selectColumn([parseInt(this.selectedCell.column)], true)
        }
    },
    verification(e) {
      if (!this.tableFocused && this.paginate.pages > 1) {
        // apenas a navegação de páginas
        this.navegacaoDePaginas(e)

      } else if (this.tableFocused && this.paginate.currentPageContent.length != 0) {
        // apenas célular e linhas
        this.navegacaoDeCelulas(e)
        this.navegacaoDeLinhas(e)

        if (e.keyCode === SHIFT_CODE)
          this.$set(this.selectedRow, 'onlyRow', !this.selectedRow.onlyRow)

        if (e.keyCode === CONTROL_CODE) {
          // mudar a função handleUnselectColumn para receber um parâmetro index
          this.$set(this.columnsSelected, 'hasSelection', !this.columnsSelected.hasSelection)

          if (this.columnsSelected.hasSelection)
            this.selectColumn([parseInt(this.selectedCell.column)], true)
        }
      }
    },

    // scroll
    disableScroll() {
      const scrollEl = this.$refs.tableComponent.parentElement.parentElement
      const keys = {37: 1, 38: 1, 39: 1, 40: 1};

      function preventDefault(e) {
        e.preventDefault();
      }

      function preventDefaultForScrollKeys(e) {
        if (keys[e.keyCode]) {
          preventDefault(e);
          return false;
        }
      }

      scrollEl.addEventListener('keydown', preventDefaultForScrollKeys, false);
    },
    enableScroll() {
      const scrollEl = this.$refs.tableComponent.parentElement.parentElement
      const keys = {37: 1, 38: 1, 39: 1, 40: 1};

      function preventDefault(e) {
        e.preventDefault();
      }

      function preventDefaultForScrollKeys(e) {
        if (keys[e.keyCode]) {
          preventDefault(e);
          return false;
        }
      }

      scrollEl.removeEventListener('keydown', preventDefaultForScrollKeys, false);
    },
    scrollTo(el, sliderEl, direction, range = 0) {
      const elRect = el.getBoundingClientRect();
      const sliderElRect = sliderEl.getBoundingClientRect();

      if (direction == "right") {
        if (range) {
          let to = range;

          sliderEl.scrollLeft += to;

        } else {
          let to = elRect.right - sliderElRect.right;

          sliderEl.scrollLeft += to;
        }

      } else if (direction == "left") {
        if (range) {
          let to = range;

          sliderEl.scrollLeft -= to;

        } else {
          let to = sliderElRect.left - elRect.left;

          sliderEl.scrollLeft -= to;
        }
      }
    },

    // pages navigation
    navegacaoDePaginas(e) {
      const navKeys = {right: 39, left: 37};
      const {nextPage, previousPage} = this.keyboardPagesListener();

      if (!this.selectedCell.initNavigation && this.paginate.pages > 1)
        switch (e.keyCode) {
          case navKeys.right:
            nextPage()
            break;

          case navKeys.left:
            previousPage()
            break;
        }
    },
    keyboardPagesListener() {
      const selectedCell = this.selectedCell;
      const selectedRow = this.selectedRow;
      const changePage = this.changePage;
      const paginate = this.paginate;
      const set = this.$set;

      return {
        nextPage() {
          if (!selectedCell.initNavigation && paginate.allPages[paginate.allPages.length - 1].length < selectedRow.row + 1 && paginate.currentPageContent === paginate.allPages[[paginate.allPages.length - 2]]) {
            set(selectedCell, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
            set(selectedRow, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
            paginate.active < paginate.pages && changePage(paginate.active, "increment");
          } else {
            paginate.active < paginate.pages && changePage(paginate.active, "increment");
          }
        },
        previousPage() {
          paginate.active > 1 && changePage(paginate.active, "decrement");
        }
      }
    },

    // cells navigation
    navegacaoDeCelulas(e) {
      const navKeys = {up: 38, down: 40, right: 39, left: 37};
      const {moveRight, moveLeft, moveDown, moveUp} = this.keyboardCellsListener();

      if (this.selectedCell.initNavigation && !this.selectedRow.onlyRow)
        switch (e.keyCode) {
          case navKeys.right:
            moveRight();
            break;

          case navKeys.left:
            moveLeft();
            break;

          case navKeys.down:
            moveDown();
            break;

          case navKeys.up:
            moveUp();
            break;
        }
    },
    keyboardCellsListener() {
      const currentSelectedCell = this.table.querySelector('.selected-cell');
      const changeSelectedCellToSibling = this.changeSelectedCellToSibling;
      const columnsSelected = this.columnsSelected;
      const selectedCell = this.selectedCell;
      const selectColumn = this.selectColumn;
      const selectedRow = this.selectedRow;
      const changePage = this.changePage;
      const paginate = this.paginate;
      const scrollTo = this.scrollTo;
      const sliderEl = this.table;
      const set = this.$set;

      return {
        moveRight() {
          let nextSelectedCell = currentSelectedCell.nextElementSibling;

          if (Number(currentSelectedCell.dataset.index) === (currentSelectedCell.parentElement.childElementCount - 1) && paginate.active < paginate.pages) {
            if ((paginate.allPages[paginate.allPages.length - 1].length < (selectedCell.row + 1) && paginate.allPages[paginate.allPages.length - 1].length < (selectedRow.row + 1)) && (paginate.currentPageContent === paginate.allPages[paginate.allPages.length - 2])) {
              set(selectedCell, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
              set(selectedRow, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
              changePage(paginate.active, "increment")

            } else {
              changePage(paginate.active, "increment")
            }
          }

          if (nextSelectedCell?.getBoundingClientRect().right > sliderEl?.getBoundingClientRect().right) scrollTo(nextSelectedCell, sliderEl, "right")

          if (columnsSelected.hasSelection && nextSelectedCell != null)
            selectColumn([parseInt(Array.from(nextSelectedCell.parentElement.children).indexOf(nextSelectedCell))], true)

          nextSelectedCell != null && changeSelectedCellToSibling(nextSelectedCell);
        },
        moveLeft() {
          let nextSelectedCell = currentSelectedCell.previousElementSibling;

          if (Number(currentSelectedCell.dataset.index) === 0 && paginate.active > 1)
            changePage(paginate.active, "decrement")

          if (columnsSelected.hasSelection && nextSelectedCell !== null)
            selectColumn([parseInt(Array.from(nextSelectedCell.parentElement.children).indexOf(nextSelectedCell))], true)

          if (nextSelectedCell?.getBoundingClientRect().right < sliderEl?.getBoundingClientRect().right) scrollTo(nextSelectedCell, sliderEl, "left")

          nextSelectedCell != null && changeSelectedCellToSibling(nextSelectedCell);
        },
        moveDown() {
          let rowId = currentSelectedCell?.parentElement.nextElementSibling?.dataset.index
          let nextSelectedRow = currentSelectedCell?.parentElement.parentElement.querySelectorAll('.form-table-div-row-body')[rowId]

          if (nextSelectedRow != null) {
            let currentSelectedCellId = Array.from(currentSelectedCell.parentElement.children).indexOf(currentSelectedCell)
            let nextSelectedCell = nextSelectedRow?.children[currentSelectedCellId]

            if (nextSelectedCell != null) { changeSelectedCellToSibling(nextSelectedCell) };
          }
        },
        moveUp() {
          let rowId = currentSelectedCell?.parentElement.previousElementSibling.dataset.index
          let nextSelectedRow = currentSelectedCell.parentElement.parentElement.querySelectorAll('.form-table-div-row-body')[rowId]

          if (nextSelectedRow != null) {
            let currentSelectedCellId = Array.from(currentSelectedCell?.parentElement.children).indexOf(currentSelectedCell)
            let nextSelectedCell = nextSelectedRow?.children[currentSelectedCellId]

            if (nextSelectedCell != null)  { changeSelectedCellToSibling(nextSelectedCell) };
          }
        },
      };
    },
    changeSelectedCellToSibling(nextSelectedCell) {
      let rowIndex = nextSelectedCell?.parentElement.dataset.index
      let columnIndex = nextSelectedCell?.dataset.index

      this.$set(this.selectedCell, "row", rowIndex);
      this.$set(this.selectedCell, "column", columnIndex);
      console.log('row: ' + rowIndex, 'column: ' + columnIndex)
    },

    // rows navigation
    navegacaoDeLinhas(e) {
      const navKeys = {up: 38, down: 40, right: 39, left: 37};
      const {moveRowUp, moveRowDown, moveRowRight, moveRowLeft} = this.keyboardRowsListener();

      if (this.selectedCell.initNavigation)
        switch (e.keyCode) {
          case navKeys.right:
            moveRowRight();
            break;

          case navKeys.left:
            moveRowLeft();
            break;

          case navKeys.up:
            moveRowUp();
            break;

          case navKeys.down:
            moveRowDown();
            break;
        }
    },
    keyboardRowsListener() {
      const currentSelectedColumn = this.table.querySelector('.column-selected');
      const changeSelectedRowToSibling = this.changeSelectedRowToSibling;
      const currentSelectedRow = this.table.querySelector('.selected');
      const columnsSelected = this.columnsSelected;
      const selectedCell = this.selectedCell;
      const selectColumn = this.selectColumn;
      const selectedRow = this.selectedRow;
      const changePage = this.changePage;
      const scrollTo = this.scrollTo;
      const paginate = this.paginate;
      const table = this.table;
      const set = this.$set;

      return {
        moveRowRight() {
          if (selectedCell.initNavigation && selectedRow.onlyRow && !columnsSelected.hasSelection) {
            const lastCell = table.querySelector('.form-table-div-row-header').lastElementChild

            if (parseInt(lastCell.getBoundingClientRect().right) > table?.getBoundingClientRect().right) {
              scrollTo(currentSelectedRow, table, "right", 200)


            } else {
              if (paginate.allPages[paginate.allPages.length - 1].length < selectedRow.row + 1 && paginate.currentPageContent === paginate.allPages[[paginate.allPages.length - 2]]) {
                set(selectedCell, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
                set(selectedRow, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
                paginate.active < paginate.pages && changePage(paginate.active, "increment")

              } else {
                paginate.active < paginate.pages && changePage(paginate.active, "increment")
              }
            }

          } else if (selectedCell.initNavigation && selectedRow.onlyRow && columnsSelected.hasSelection) {
            let nextSelectedColumn = currentSelectedColumn.nextElementSibling;

            if (Number(currentSelectedColumn.dataset.index) === (currentSelectedColumn.parentElement.childElementCount - 1) && paginate.active < paginate.pages) {

              if ((paginate.allPages[paginate.allPages.length - 1].length < (selectedCell.row + 1) && paginate.allPages[paginate.allPages.length - 1].length < (selectedRow.row + 1)) && (paginate.currentPageContent === paginate.allPages[paginate.allPages.length - 2])) {
                set(selectedCell, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
                set(selectedRow, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
                changePage(paginate.active, "increment")

              } else {
                changePage(paginate.active, "increment")
              }
            }
            if (nextSelectedColumn?.getBoundingClientRect().right > table?.getBoundingClientRect().right) scrollTo(nextSelectedColumn, table, "right");

            nextSelectedColumn !== null && selectColumn([parseInt(nextSelectedColumn.dataset.index)], true)

          }
        },
        moveRowLeft() {
          if (selectedCell.initNavigation && selectedRow.onlyRow && !columnsSelected.hasSelection) {
            if (currentSelectedRow?.getBoundingClientRect().left < table?.getBoundingClientRect().left) scrollTo(currentSelectedRow, table, "left", 200);

            else paginate.active > 1 && changePage(paginate.active, "decrement")

          } else if (selectedCell.initNavigation && selectedRow.onlyRow && columnsSelected.hasSelection) {
            let nextSelectedColumn = currentSelectedColumn.previousElementSibling;

            if (Number(currentSelectedColumn.dataset.index) === 0 && paginate.active > 1) changePage(paginate.active, "decrement")

            if (nextSelectedColumn?.getBoundingClientRect().left < table?.getBoundingClientRect().left) scrollTo(nextSelectedColumn, table, "left");

            nextSelectedColumn !== null && selectColumn([parseInt(nextSelectedColumn.dataset.index)], true)
          }
        },
        moveRowUp() {
          let rowId = currentSelectedRow.previousElementSibling?.dataset.index
          let nextSelectedRow = table.querySelectorAll('.form-table-div-row-body')[rowId]

          nextSelectedRow != null && set(selectedCell, 'row', rowId);

          nextSelectedRow != null && changeSelectedRowToSibling(nextSelectedRow);
        },
        moveRowDown() {
          let rowId = currentSelectedRow.nextElementSibling?.dataset.index
          let nextSelectedRow = table.querySelectorAll('.form-table-div-row-body')[rowId]

          nextSelectedRow != null && set(selectedCell, 'row', rowId);

          nextSelectedRow != null && changeSelectedRowToSibling(nextSelectedRow);
        }
      }
    },
    changeSelectedRowToSibling(nextSelectedRow) {
      const rowIndex = Array.from(this.table.querySelectorAll('.form-table-div-row-body')).indexOf(nextSelectedRow)

      this.$set(this.selectedRow, 'row', rowIndex)
    },

    // cells and rows navigation by click
    clickNavigationListener(e) {
      e.target.closest('div.form-table-div-table').focus()

      this.mouseNavigation(e);
    },
    mouseNavigation(e) {
      let nextSelectedCell = e.target.tagName === "SPAN" ? e.target.parentElement : e.target;
      let columnIndex = Array.from(nextSelectedCell?.parentElement.querySelectorAll('.form-table-div-content')).indexOf(nextSelectedCell)
      let rowIndex = Array.from(nextSelectedCell?.parentElement.parentElement.querySelectorAll('.form-table-div-row-body')).indexOf(nextSelectedCell.parentElement)

      this.changeSelectedCellToSibling(nextSelectedCell);

      if (this.columnsSelected.hasSelection)
        this.selectColumn([parseInt(columnIndex)], true)

      this.$set(this.selectedRow, 'row', rowIndex);
    },

    // to drag columns
    handleStartDraggable() {
      let width = 0;
      let left = 0;


      this.table.querySelectorAll(".form-table-div-header.column-selected").forEach((el) => {
        if (!left) left = el.offsetLeft;
        width += el.offsetWidth;
      });

      const fakeColumn = this.table.querySelector(".draggable-indicator");
      fakeColumn.style.width = `${width}px`;
      fakeColumn.style.left = `${left}px`;
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

        this.$set(this.selectedCell, 'column', newIndexes)
        this.$set(this.columnsSelected, "indexes", newIndexes);
        this.$forceUpdate();
        this.$nextTick(() => this.handleColumnsHiddenAfterDrag());
      }

      this.draggable = {};
      this.removeBorderIndicator();
    },
    handleIndicatorPosition(fakeColumn) {
      const rect = fakeColumn.getBoundingClientRect();
      const elements = document.elementsFromPoint(rect.x, fakeColumn.getBoundingClientRect().top);

      if (elements) {
        let cell = elements.find((el) => el.classList.contains('form-table-div-header'));

        if (cell && rect.x !== this.draggable.indicatorIndex) {
          const measures = rect.x - rect.width / 2;
          const measuresCell = cell.getBoundingClientRect();
          let className = null;
          let nextIndex = parseInt(cell.dataset.index);
          const {indexes} = this.columnsSelected;
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
        if (this.columnsSelected.indexes.includes(parseInt(index)) && this.columnsSelected.hasSelection) {
          this.handleStartDraggable();

        } else {
          this.selectColumn([parseInt(index)], true);
          document.addEventListener("click", this.handleUnselectColumn);
        }
      }
    },
    selectColumn(index, reset) {
      const indexes = reset ? index : [...new Set([...this.columnsSelected.indexes, index])];


      this.colunas = this.colunas.map((column, key) => {
        column.selected = indexes.includes(key) || (key > Math.min(...indexes) && key < Math.max(...indexes));

        return column;
      });

      this.$set(this.selectedCell, 'column', indexes[0])

      this.$set(this.columnsSelected, "hasSelection", true);
      this.$set(this.columnsSelected, "indexes", indexes);
    },
    handleUnselectColumn(e) {
      if (this.columnsSelected.indexes.length) {
        if (!e.target.closest("div.form-table-div-header")) {
          this.colunas = this.colunas.map((column) => {
            column.selected = false;

            return column;
          });
          document.removeEventListener("click", this.handleUnselectColumn);
          this.$set(this.columnsSelected, "indexes", []);
          this.$set(this.columnsSelected, "hasSelection", false);
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

      this.$set(this.selectedCell, 'row', 0)
      this.$set(this.selectedCell, 'cell', 0)
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
      const elRect = document.querySelectorAll('.form-table-div-header')[(document.querySelector('.form-table-div-row-header').childElementCount - 1)]

      if (action) {
        if (action === "increment"){
          page++

          this.$set(this.selectedCell, "column", 0)

          if ((this.selectedCell.initNavigation && this.columnsSelected.hasSelection) || (this.selectedCell.initNavigation && this.columnsSelected.hasSelection)) this.selectColumn([0], true)

          if (this.selectedCell.initNavigation) this.$refs.tableComponent.scrollLeft = 0

        } else if (action === "decrement") {
          page--

          this.$set(this.selectedCell, "column", document.querySelector('.form-table-div-table .form-table-div-row-body').childElementCount - 1)

          if (this.selectedCell.initNavigation && this.columnsSelected.hasSelection) this.selectColumn([(document.querySelector('.form-table-div-table .form-table-div-row-body').childElementCount - 1)], true)

          if (this.selectedCell.initNavigation) this.$refs.tableComponent.scrollLeft = (elRect.offsetLeft + elRect.offsetWidth) - (this.$refs.tableComponent.offsetLeft + this.$refs.tableComponent.offsetWidth)
        }
      };

      if (page !== this.paginate.active)
        this.$set(this.paginate, "active", page);


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

    applyShadowOnCell() {
      this.table.querySelectorAll('.form-table-div-content span').forEach(o => {
        const flag = o.offsetWidth > o.parentElement.offsetWidth;

        if (!!flag) {
          const span = document.createElement('span');

          span.classList.add('blur')

          span.style.width = "16px"
          span.style.height = "100%"
          span.style.position = "absolute"
          span.style.blur = '50px'
          span.style.right = "0px"
          span.style.background = "linear-gradient(270deg, #88888850, #F2F2F201"

          o.parentElement.appendChild(span)
        }
      })
    },
    defineRowsMargin() {
      if (this.table) {
        const rows = Array.from(this.table?.querySelectorAll('.form-table-div-row-body, .form-table-div-row-header'));

        rows.forEach( k => {
          k.style.marginBottom = `${-(k.offsetHeight - k.children[0].offsetHeight)}px`
        })
      }
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
        this.habilitaEventos();
        this.defineResizePosition();
        this.applyShadowOnCell();
      });
    },


  },
  created() {
      this.setarAtalho();
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
    atalhos: [{key: 16 }, {key: 0}], //passar 16 shift ou 17 ctrl ou []
  },
  methods: {
    linhaSelecionada(item) {
      console.log(JSON.stringify(item));
    },
    colunaSelecionada(item, coluna) {
      console.log(item[coluna.nome]);
    },
  },
  mounted() {},
});

