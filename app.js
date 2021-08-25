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
    nome: {type: String, required: true},
    fields: {type: Array, required: true},
    itens: {type: Array, required: true},
    linhas: {type: Number, required: false, default: () => 20},
    fnSelecionado: {type: Function, required: false},
    fnColunaSelecionada: {type: Function, required: false},
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
      selectedRow: {row: 0, onlyRow: false},
      tableFocused: false,
      menuShowIndex: null,
      hoverEl: null,
      table: null
    }
  },
  watch: {
    fields() {
      this.colunas = this.processar(this.fields);
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

      let k = this.fields.map(i => Object.defineProperty({}, i.key, { value: this.itens.filter((j, k) => k < 10).map(j => j[i.key] || '').map(j => String(j)).map(j => j.length).reduce((a, j) => a > j ? a : j, 0) }))
     
      let prop = k.map(a => Object.getOwnPropertyNames(a)[0])
      let total = k.map((o, i) => o[prop[i]]).reduce((a, c) =>  a + c, 0)
      let columnsSize = []
      
      prop.map((o, i) => columnsSize[o] = parseFloat(((k[i][o] / total) * 100).toFixed(1))).reduce( (a, i) => a + i)

      console.log(k, prop, total, columnsSize, prop.map((o, i) => columnsSize[o] = parseFloat(((k[i][o] / total) * 100).toFixed(1))).reduce( (a, i) => a + i))

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
    processar(f) {
      const t = [];
      const x = JSON.parse(localStorage.getItem(`form-table-${this.nome}`)) || f;
      x.forEach((i) => {

        i.style = i.style || {}
        let k = x.find((j) => j.key === i.key);
        if (k) {
          i.style.width = i.width + 'px'
          t.push({...k, width: i.width})
        }
      })

      return t;
    },
    selecionar(linha, indiceLinha, coluna, indiceColuna) {
      Vue.set(this.selecao, "linha", indiceLinha);
      Vue.set(this.selecao, "coluna", indiceColuna);

      if (this.fnSelecionado) {
        this.fnSelecionado(linha);
      }

      if (this.fnColunaSelecionada) {
        this.fnColunaSelecionada(linha, coluna);
      }
    },
    focus() {
      this.selecao.ativo = true;
    },
    blur() {
      this.selecao.ativo = false;
    },
    columnResize(event) {
      const column = event.target.parentElement;
      const coluna = this.colunas.find(
        (c) => c.key === column.attributes.key.value
      );

      const x = event.clientX;
      const w = parseInt(window.getComputedStyle(column).width);

      const mousemove = (e) => {
        Vue.set(coluna, "width", w - x + e.clientX);
      };

      const mouseup = () => {
        localStorage.setItem(
          `form-table-${this.nome}`,
          JSON.stringify(this.colunas)
        );
        document.removeEventListener("mousemove", mousemove);
        document.removeEventListener("mouseup", mouseup);
      };

      document.addEventListener("mousemove", mousemove);
      document.addEventListener("mouseup", mouseup);
    },
    columnReorder(event) {
      this.selecao.column = event.target.parentElement;
      this.selecao.row = this.selecao.column.parentElement;
      this.selecao.table = this.selecao.row.parentElement.parentElement;
      this.selecao.draggingColumnIndex = [].slice
        .call(this.selecao.row.children)
        .indexOf(this.selecao.column);

      // Determine the mouse position
      this.selecao.x = event.clientX - this.selecao.column.offsetLeft;
      this.selecao.y = event.clientY - this.selecao.column.offsetTop;

      const swap = (nodeA, nodeB) => {
        const parentA = nodeA.parentNode;
        const siblingA =
          nodeA.nextSibling === nodeB ? nodeA : nodeA.nextSibling;
        nodeB.parentNode.insertBefore(nodeA, nodeB);
        parentA.insertBefore(nodeB, siblingA);
      };

      const isOnLeft = function (nodeA, nodeB) {
        const rectA = nodeA.getBoundingClientRect();
        const rectB = nodeB.getBoundingClientRect();
        return rectA.left + rectA.width / 2 < rectB.left + rectB.width / 2;
      };

      const cloneTable = (table) => {
        const rect = table.getBoundingClientRect();

        this.selecao.list = document.createElement("div");
        this.selecao.list.classList.add("clone-list");
        this.selecao.list.style.position = "absolute";
        this.selecao.list.style.left = `${rect.left}px`;
        this.selecao.list.style.top = `${rect.top}px`;
        table.parentNode.insertBefore(this.selecao.list, table);

        table.style.visibility = "hidden";

        const originalCells = [].slice.call(
          table.querySelectorAll(".div-table-cell")
        );

        const originalHeaderCells = [].slice.call(
          table.querySelectorAll(".div-table-head")
        );
        const numColumns = originalHeaderCells.length;

        // Loop through the header cells
        originalHeaderCells.forEach((headerCell, headerIndex) => {
          const width = parseInt(window.getComputedStyle(headerCell).width);

          // Create a new table from given row
          const item = document.createElement("div");
          item.classList.add("draggable");

          const newTable = document.createElement("div");
          newTable.setAttribute("class", "clone-table");
          newTable.style.width = `${width}px`;

          // Header
          const th = headerCell.cloneNode(true);
          let newRow = document.createElement("div");
          newRow.appendChild(th);
          newTable.appendChild(newRow);

          const cells = originalCells.filter(
            (c, idx) => (idx - headerIndex) % numColumns === 0
          );

          cells.forEach((cell) => {
            const r = cell.getBoundingClientRect();

            const newCell = cell.cloneNode(true);
            newCell.style.width = `${r.width}px`;
            newRow = document.createElement("div");
            newRow.style.height = `${r.height}px`;
            newRow.appendChild(newCell);
            newTable.appendChild(newRow);
          });

          item.appendChild(newTable);
          this.selecao.list.appendChild(item);
          console.log(this.selecao.list, item);
        });
      };

      const mousemove = (e) => {
        if (!this.selecao.isDraggingStarted) {
          this.selecao.isDraggingStarted = true;

          cloneTable(this.selecao.table);

          this.selecao.draggingEle = [].slice.call(this.selecao.list.children)[
            this.selecao.draggingColumnIndex
            ];
          this.selecao.draggingEle.classList.add("dragging");

          this.selecao.placeholder = document.createElement("div");
          this.selecao.placeholder.classList.add("placeholder");
          this.selecao.draggingEle.parentNode.insertBefore(
            this.selecao.placeholder,
            this.selecao.draggingEle.nextSibling
          );
          this.selecao.placeholder.style.width = `${this.selecao.draggingEle.offsetWidth}px`;
        }

        this.selecao.draggingEle.style.position = "absolute";
        this.selecao.draggingEle.style.top = `${
          this.selecao.draggingEle.offsetTop + e.clientY - this.selecao.y
        }px`;
        this.selecao.draggingEle.style.left = `${
          this.selecao.draggingEle.offsetLeft + e.clientX - this.selecao.x
        }px`;

        this.selecao.x = e.clientX;
        this.selecao.y = e.clientY;

        const prevEle = this.selecao.draggingEle.previousElementSibling;
        const nextEle = this.selecao.placeholder.nextElementSibling;

        if (prevEle && isOnLeft(this.selecao.draggingEle, prevEle)) {
          swap(this.selecao.placeholder, this.selecao.draggingEle);
          swap(this.selecao.placeholder, prevEle);
          return;
        }

        if (nextEle && isOnLeft(nextEle, this.selecao.draggingEle)) {
          swap(nextEle, this.selecao.placeholder);
          swap(nextEle, this.selecao.draggingEle);
        }
      };

      const mouseup = (e) => {
        const endColumnIndex = [].slice
          .call(this.selecao.list.children)
          .indexOf(this.selecao.draggingEle);
        this.selecao.isDraggingStarted = false;

        console.log(this.selecao.placeholder);

        this.selecao.placeholder && this.selecao.placeholder.parentElement.removeChild(this.selecao.placeholder);
        this.selecao.list && this.selecao.list.parentNode.removeChild(this.selecao.list);

        this.selecao.draggingEle.classList.remove("dragging");
        this.selecao.draggingEle.style.removeProperty("top");
        this.selecao.draggingEle.style.removeProperty("left");
        this.selecao.draggingEle.style.removeProperty("position");

        document.removeEventListener("mousemove", mousemove);
        document.removeEventListener("mouseup", mouseup);

        this.colunas.splice(endColumnIndex, 0, this.colunas.splice(this.selecao.draggingColumnIndex, 1)[0]);
        this.selecao.table.style.removeProperty("visibility");

        localStorage.setItem(`form-table-${this.nome}`, JSON.stringify(this.colunas));
      };

      // Attach the listeners to `document`
      document.addEventListener("mousemove", mousemove);
      document.addEventListener("mouseup", mouseup);
    },
    key(event) {
      console.log(event);
      if (event.type === "keydown") {
        if (event.key === "ArrowDown") {
          this.selecao.linha = Math.min(
            this.selecao.linha + 1,
            this.itens.length - 1
          );
        } else if (event.key === "ArrowUp") {
          this.selecao.linha = Math.max(this.selecao.linha - 1, 0);
        } else if (event.key === "ArrowRight") {
          this.selecao.coluna = Math.min(
            this.selecao.coluna + 1,
            this.colunas.length - 1
          );
        } else if (event.key === "ArrowLeft") {
          this.selecao.coluna = Math.max(this.selecao.coluna - 1, 0);
        }
      }

      if (event.key !== "Tab") {
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
      }
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

            if (e.keyCode === 16)
              this.$set(this.selectedRow, 'onlyRow', !this.selectedRow.onlyRow)

            if (e.keyCode === 17) {
              this.$set(this.columnsSelected, 'hasSelection', !this.columnsSelected.hasSelection)

              if (this.columnsSelected.hasSelection) this.selectColumn([parseInt(this.selectedCell.column)], true)
            }
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
    verification(e) {
      if (!this.tableFocused && this.paginate.pages > 1) {
        // apenas a navegação de páginas
        this.navegacaoDePaginas(e)

      } else if (this.tableFocused && this.paginate.currentPageContent.length != 0) {
        // apenas célular e linhas
        this.navegacaoDeCelulas(e)
        this.navegacaoDeLinhas(e)

        if (e.keyCode === 16)
          this.$set(this.selectedRow, 'onlyRow', !this.selectedRow.onlyRow)

        if (e.keyCode === 17) {
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

          if (currentSelectedCell.cellIndex === (currentSelectedCell.parentElement.childElementCount - 1) && paginate.active < paginate.pages) {
            if ((paginate.allPages[paginate.allPages.length - 1].length < (selectedCell.row + 1) && paginate.allPages[paginate.allPages.length - 1].length < (selectedRow.row + 1)) && (paginate.currentPageContent === paginate.allPages[paginate.allPages.length - 2])) {
              set(selectedCell, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
              set(selectedRow, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
              changePage(paginate.active, "increment")

            } else {
              changePage(paginate.active, "increment")
            }
          }

          if (nextSelectedCell?.getBoundingClientRect().right > sliderEl?.getBoundingClientRect().right) scrollTo(nextSelectedCell, sliderEl, "right")

          if (columnsSelected.hasSelection && nextSelectedCell !== null)
            selectColumn([parseInt(nextSelectedCell.cellIndex)], true)

          nextSelectedCell !== null && changeSelectedCellToSibling(nextSelectedCell);
        },
        moveLeft() {
          let nextSelectedCell = currentSelectedCell.previousElementSibling;

          if (currentSelectedCell.cellIndex === 0 && paginate.active > 1)
            changePage(paginate.active, "decrement")

          if (columnsSelected.hasSelection && nextSelectedCell !== null)
            selectColumn([parseInt(nextSelectedCell.cellIndex)], true)

          if (nextSelectedCell?.getBoundingClientRect().right < sliderEl?.getBoundingClientRect().right) scrollTo(nextSelectedCell, sliderEl, "left")

          nextSelectedCell != null && changeSelectedCellToSibling(nextSelectedCell);
        },
        moveDown() {
          let nextSelectedTrow = currentSelectedCell.parentElement.nextElementSibling;

          if (nextSelectedTrow !== null) {
            let currentSelectedCellId = currentSelectedCell.cellIndex;
            let nextSelectedCell = nextSelectedTrow.cells[currentSelectedCellId];

            nextSelectedCell !== null && changeSelectedCellToSibling(nextSelectedCell);
          }
        },
        moveUp() {
          let nextSelectedTrow = currentSelectedCell.parentElement.previousElementSibling;

          if (nextSelectedTrow !== null) {
            let currentSelectedCellId = currentSelectedCell.cellIndex;
            let nextSelectedCell = nextSelectedTrow.cells[currentSelectedCellId];

            nextSelectedCell !== null && changeSelectedCellToSibling(nextSelectedCell);
          }
        },
      };
    },
    changeSelectedCellToSibling(nextSelectedCell) {
      this.$set(this.selectedCell, "row", nextSelectedCell.parentElement.rowIndex - 1);
      this.$set(this.selectedCell, "column", nextSelectedCell.cellIndex);
      console.log('row: ' + (nextSelectedCell.parentElement.rowIndex - 1), 'column: ' + nextSelectedCell.cellIndex)
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
      const sliderEl = this.table;
      const set = this.$set;

      return {
        moveRowRight() {
          if (selectedCell.initNavigation && selectedRow.onlyRow && !columnsSelected.hasSelection) {
            if (currentSelectedRow?.getBoundingClientRect().right > sliderEl?.getBoundingClientRect().right) {
              scrollTo(currentSelectedRow, sliderEl, "right", 200)

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

            if (currentSelectedColumn.cellIndex === (currentSelectedColumn.parentElement.childElementCount - 1) && paginate.active < paginate.pages) {

              if ((paginate.allPages[paginate.allPages.length - 1].length < (selectedCell.row + 1) && paginate.allPages[paginate.allPages.length - 1].length < (selectedRow.row + 1)) && (paginate.currentPageContent === paginate.allPages[paginate.allPages.length - 2])) {
                set(selectedCell, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
                set(selectedRow, 'row', paginate.allPages[paginate.allPages.length - 1].length - 1)
                changePage(paginate.active, "increment")

              } else {
                changePage(paginate.active, "increment")
              }
            }
            if (nextSelectedColumn?.getBoundingClientRect().right > sliderEl?.getBoundingClientRect().right) scrollTo(nextSelectedColumn, sliderEl, "right");

            nextSelectedColumn !== null && selectColumn([parseInt(nextSelectedColumn.cellIndex)], true)

          }
        },
        moveRowLeft() {
          if (selectedCell.initNavigation && selectedRow.onlyRow && !columnsSelected.hasSelection) {
            if (currentSelectedRow?.getBoundingClientRect().left < sliderEl?.getBoundingClientRect().left) scrollTo(currentSelectedRow, sliderEl, "left", 200);

            else paginate.active > 1 && changePage(paginate.active, "decrement")

          } else if (selectedCell.initNavigation && selectedRow.onlyRow && columnsSelected.hasSelection) {
            let nextSelectedColumn = currentSelectedColumn.previousElementSibling;

            if (currentSelectedColumn.cellIndex === 0 && paginate.active > 1) changePage(paginate.active, "decrement")

            if (nextSelectedColumn?.getBoundingClientRect().left < sliderEl?.getBoundingClientRect().left) scrollTo(nextSelectedColumn, sliderEl, "left");

            nextSelectedColumn !== null && selectColumn([parseInt(nextSelectedColumn.cellIndex)], true)
          }
        },
        moveRowUp() {
          let nextSelectedRow = currentSelectedRow.previousElementSibling;

          nextSelectedRow !== null && set(selectedCell, 'row', (nextSelectedRow.rowIndex - 1));

          nextSelectedRow !== null && changeSelectedRowToSibling(nextSelectedRow);
        },
        moveRowDown() {
          let nextSelectedRow = currentSelectedRow.nextElementSibling;

          nextSelectedRow !== null && set(selectedCell, 'row', (nextSelectedRow.rowIndex - 1));

          nextSelectedRow !== null && changeSelectedRowToSibling(nextSelectedRow);
        }
      }
    },
    changeSelectedRowToSibling(nextSelectedRow) {
      this.$set(this.selectedRow, 'row', nextSelectedRow.rowIndex - 1)
    },

    // cells and rows navigation by click
    clickNavigationListener(e) {
      e.target.closest('table').focus()

      this.mouseNavigation(e);
    },
    mouseNavigation(e) {
      let nextSelectedCell = e.target;

      this.changeSelectedCellToSibling(nextSelectedCell);

      if (this.columnsSelected.hasSelection)
        this.selectColumn([parseInt(nextSelectedCell.cellIndex)], true)

      this.$set(this.selectedRow, 'row', nextSelectedCell.parentElement.rowIndex - 1);
    },

    // to drag columns
    handleStartDraggable() {
      let width = 0;
      let left = 0;

      this.table.querySelectorAll("th.column-selected").forEach((el) => {
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
        let cell = elements.find((el) => el.nodeName === "TH");

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
              cell = this.table.querySelector(`td[data-index="${nextIndex}"]`);
            }

            if (cell) className = classRight;
            if (nextIndex === min || middle.includes(nextIndex))
              nextIndex = max;
          }

          if (className) {
            this.$set(this.draggable, "indicatorIndex", rect.x);
            this.removeBorderIndicator();
            this.table.querySelectorAll(`td[data-index="${nextIndex}"], th[data-index="${nextIndex}"]`).forEach((el) => el.classList.add(className, "new-index-table"));
          }
        }
      }
    },
    removeBorderIndicator() {
      this.table.querySelectorAll("td, th").forEach((el) =>
        el.classList.remove("dragging-border-left", "dragging-border-right", "new-index-table")
      );
    },

    // resize Columns
    handleDownChangeSize(e, header, colIndex) {
      this.$set(this.resize, "colIndex", colIndex);
      this.$set(this.resize, "width", parseInt(header.width || 100, 10));

      const [element] = this.$refs[`resize-${colIndex}`];
      const rect = element.getBoundingClientRect();

      element.classList.add("dragged");
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;

      this.$set(this.resize, "offset", rect.left);

      const body = this.$el.querySelector("tbody");
      const lineHeight = this.$el.querySelector("tbody").firstElementChild.offsetHeight;

      element.style.setProperty("--dragHeaderHeight", `${body.offsetHeight + lineHeight}px`);

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
      const newSize = result > 0 ? oldWidth + result : oldWidth - result * -1;
      const newLeft = result > 0 ? oldOffset + result : oldOffset - result * -1;

      if (20 < newSize) {
        element.style.left = `${newLeft}px`;
        element.style.top = `${element.offsetTop}px`;

        this.$set(this.colunas[this.resize.colIndex], "width", newSize);
      }
    },
    defineResizePosition() {
      setTimeout(() => {
        if (!!this.table) {
          const resizeEl = this.$el.querySelectorAll('.table-component th .resize-column');

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

      if (element?.tagName === "TH") {
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
        if (!e.target.closest("th")) {
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
      if (colIndex === this.menuShowIndex) colIndex = null;

      if (colIndex !== null) {
        let el = e.target.closest("th");
        let dropdownEl = document.querySelectorAll('.table-component .dropdown-filter-menu')[colIndex];
        let rightPosition = el.offsetLeft + el.offsetWidth;

        dropdownEl.style.left = rightPosition - dropdownEl.offsetWidth - 162 + 'px';

        if (dropdownEl.offsetLeft === 0 && el.cellIndex === 0)
          dropdownEl.style.left = 0;
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
      const elRect = document.querySelectorAll('th')[(document.querySelector('tbody tr').childElementCount - 1)]

      if (action) {
        if (action === "increment"){
          page++

          this.$set(this.selectedCell, "column", 0)

          if ((this.selectedCell.initNavigation && this.columnsSelected.hasSelection) || (this.selectedCell.initNavigation && this.columnsSelected.hasSelection)) this.selectColumn([0], true)

          if (this.selectedCell.initNavigation) this.$refs.tableComponent.scrollLeft = 0

        } else if (action === "decrement") {
          page--

          this.$set(this.selectedCell, "column", document.querySelector('tbody tr').childElementCount - 1)

          if (this.selectedCell.initNavigation && this.columnsSelected.hasSelection) this.selectColumn([(document.querySelector('tbody tr').childElementCount - 1)], true)

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

    // Table start
    afterTableMounted() {
      this.$nextTick(() => {
        const table = this.$refs.tableComponent;
        if (table) {
          this.table = table;
          this.definePaginatePosition();
        } else {
          console.log("Table not started");
        }
      });

      this.$nextTick(() => {
        this.habilitaEventos();
        this.defineResizePosition();
      });
    },


  },
  created() {

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
            nome: "Daniel",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "03/12/2001",
            texto: "Hello World!",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 1,
            nome: "Daniel",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "03/12/2001",
            texto: "Hello World!",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 2,
            nome: "João",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World!",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 3,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 1,
            nome: "Daniel",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "03/12/2001",
            texto: "Hello World!",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 1,
            nome: "Daniel",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "03/12/2001",
            texto: "Hello World!",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 2,
            nome: "João",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World!",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 3,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Oliveira",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Oliveira",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Oliveira",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },{
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Oliveira",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Oliveira",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },{
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Oliveira",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 1,
            nome: "Daniel",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "03/12/2001",
            texto: "Hello World!",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 1,
            nome: "Daniel",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "03/12/2001",
            texto: "Hello World!",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 2,
            nome: "João",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World!",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 3,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Sampaio",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
          {
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Oliveira",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },{
            id: 4,
            nome: "Fernando",
            descricao: "Descrição de teste",
            sobrenome: "Oliveira",
            nascimento: "04/09/2001",
            texto: "Hello World maior para quebrar linha! ",
            data: "Null",
            procedimento: "Null",
            conclusao: "Null",
          },
  
        {
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Oliveira",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },{
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Oliveira",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Oliveira",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },{
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Oliveira",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 1,
          nome: "Daniel",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "03/12/2001",
          texto: "Hello World!",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 1,
          nome: "Daniel",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "03/12/2001",
          texto: "Hello World!",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 2,
          nome: "João",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "04/09/2001",
          texto: "Hello World!",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 3,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Sampaio",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
        {
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Oliveira",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },{
          id: 4,
          nome: "Fernando",
          descricao: "Descrição de teste",
          sobrenome: "Oliveira",
          nascimento: "04/09/2001",
          texto: "Hello World maior para quebrar linha! ",
          data: "Null",
          procedimento: "Null",
          conclusao: "Null",
        },
  
      {
        id: 4,
        nome: "Fernando",
        descricao: "Descrição de teste",
        sobrenome: "Sampaio",
        nascimento: "04/09/2001",
        texto: "Hello World maior para quebrar linha! ",
        data: "Null",
        procedimento: "Null",
        conclusao: "Null",
      },
      {
        id: 4,
        nome: "Fernando",
        descricao: "Descrição de teste",
        sobrenome: "Sampaio",
        nascimento: "04/09/2001",
        texto: "Hello World maior para quebrar linha! ",
        data: "Null",
        procedimento: "Null",
        conclusao: "Null",
      },
      {
        id: 4,
        nome: "Fernando",
        descricao: "Descrição de teste",
        sobrenome: "Oliveira",
        nascimento: "04/09/2001",
        texto: "Hello World maior para quebrar linha! ",
        data: "Null",
        procedimento: "Null",
        conclusao: "Null",
      },{
        id: 4,
        nome: "Fernando",
        descricao: "Descrição de teste",
        sobrenome: "Oliveira",
        nascimento: "04/09/2001",
        texto: "Hello World maior para quebrar linha! ",
        data: "Null",
        procedimento: "Null",
        conclusao: "Null",
      },
      {
        id: 4,
        nome: "Fernando",
        descricao: "Descrição de teste",
        sobrenome: "Sampaio",
        nascimento: "04/09/2001",
        texto: "Hello World maior para quebrar linha! ",
        data: "Null",
        procedimento: "Null",
        conclusao: "Null",
      },
      {
        id: 4,
        nome: "Fernando",
        descricao: "Descrição de teste",
        sobrenome: "Sampaio",
        nascimento: "04/09/2001",
        texto: "Hello World maior para quebrar linha! ",
        data: "Null",
        procedimento: "Null",
        conclusao: "Null",
      },
      {
        id: 4,
        nome: "Fernando",
        descricao: "Descrição de teste",
        sobrenome: "Oliveira",
        nascimento: "04/09/2001",
        texto: "Hello World maior para quebrar linha! ",
        data: "Null",
        procedimento: "Null",
        conclusao: "Null",
      },{
        id: 4,
        nome: "Fernando",
        descricao: "Descrição de teste",
        sobrenome: "Oliveira",
        nascimento: "04/09/2001",
        texto: "Hello World maior para quebrar linha! ",
        data: "Null",
        procedimento: "Null",
        conclusao: "Null",
      },
        ],
      },
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