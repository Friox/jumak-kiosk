const socket = io()

function updateConnectStatus(val) {
    var connectStatusEl = document.getElementById('connect-status')
    if (val) {
        connectStatusEl.textContent = '정상'
        connectStatusEl.style.color = 'green'
    } else {
        connectStatusEl.textContent = '연결 끊어짐'
        connectStatusEl.style.color = 'red'
    }
}

function convertNumber(val) {
    const num = parseInt(val)
    if (isNaN(num)) return '0'
    return num.toLocaleString('ko-KR')
}

const ONLY_DATE = 'only_year'
const ONLY_TIME = 'only_time'
const FULL_DATE = 'full_date'

const ORDER_STATUS_WAITING = 1
const ORDER_STATUS_COMPLETE = 2
const ORDER_STATUS_CANCELED = 3

function convertDate(val, type) {
    const date = new Date(val)
    const year = date.getFullYear().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    if (type == ONLY_DATE) {
        return `${year}.${month}.${day}`
    } else if (type == ONLY_TIME) {
        return `${hour}:${minutes}`
    } else if (type == FULL_DATE) {
        return `${year}.${month}.${day} ${hour}:${minutes}`
    } else {
        return `Unknown`
    }
}

socket.on('connect', () => {
    updateConnectStatus(true)
})

socket.on('disconnect', () => {
    updateConnectStatus(false)
})

var oSelectedTable = 0

function controlPeople(block, cnt) {
    const people4El = document.getElementById('people-radio-4')
    const people6El = document.getElementById('people-radio-6')
    if (block) {
        people4El.disabled = true
        people6El.disabled = true
    } else {
        people4El.disabled = false
        people6El.disabled = false
    }
    if (cnt == 6) {
        peopleCnt = 6
        people4El.checked = false
        people6El.checked = true
    } else {
        peopleCnt = 4
        people4El.checked = true
        people6El.checked = false
    }
}

async function requestOrder() {
    let flag = false
    for (const [key, value] of orderSheet) {
        if (value) {
            flag = true
            break
        }
    }
    if (flag) {
        const people4El = document.getElementById('people-radio-4')
        const people6El = document.getElementById('people-radio-6')
        let peopleType = 0
        if (people4El.checked) peopleType = 4
        else if (people6El.checked) peopleType = 6
        const requestOrderRes = await axios({
            method: 'post',
            url: '/api/requestOrder',
            headers: {
                Authorization: apitoken
            },
            data: {
                tabletype: peopleType,
                tablenum: oSelectedTable,
                orders: Object.fromEntries(orderSheet)
            }
        })
        const requestOrderData = requestOrderRes.data
        if (requestOrderData && requestOrderData.success) {
            updateTableStatus()
            // updateOrderHistory()
            updateOrderHistoryV2()
            resetOrderSheet()
            drawPurchaseTables()
            socket.emit('REQ_REFRESH_TABLE')
            Swal.fire({
                title: '주문 완료',
                text: requestOrderData.type == 'new' ? '신규 주문 완료' : '추가 주문 완료',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            })
        } else {
            Swal.fire({
                title: '주문 실패',
                text: '?',
                icon: 'error',
                timer: 1500,
                showConfirmButton: false
            })
        }
    } else {
        Swal.fire({
            title: '주문 실패',
            text: '주문할게 없어요~',
            icon: 'error'
        })
    }
}

function unselectClick() {
    var unselectBtnEl = document.getElementById('unselect-btn')
    oSelectedTable = 0
    unselectBtnEl.disabled = true
    updateTableStatus()
}

async function refreshOrderStatus(uid) {
    const getOrderStatusRes = await axios({
        method: 'post',
        url: '/api/getOrderStatus',
        headers: {
            Authorization: apitoken
        },
        data: {
            uid: uid
        }
    })
    const data = getOrderStatusRes.data
    if (data && data.success) {
        const rowEl = document.getElementById(`order-history-row-${uid}`)
        if (rowEl) {
            const statusEl = rowEl.querySelector('#order-history-status')
            const btnEl = rowEl.querySelector('#order-history-compbtn')
            if (data.data == ORDER_STATUS_WAITING) {
                // 대기중
                rowEl.classList.add('table-warning')
                statusEl.textContent = '대기중'
                btnEl.classList.add('btn-primary')
                btnEl.classList.remove('btn-secondary')
                btnEl.textContent = '완료'
                btnEl.onclick = async () => {
                    if (await completeOrder(uid)) {
                        refreshOrderStatus(uid)
                        socket.emit('REQ_REFRESH_ORDER_ROW', uid)
                    }
                }
            } else if (data.data == ORDER_STATUS_COMPLETE) {
                // 완료됨
                rowEl.classList.remove('table-warning')
                statusEl.textContent = '완료됨'
                btnEl.classList.remove('btn-primary')
                btnEl.classList.add('btn-secondary')
                btnEl.textContent = '대기'
                btnEl.onclick = async () => {
                    if (await incompleteOrder(uid)) {
                        refreshOrderStatus(uid)
                        socket.emit('REQ_REFRESH_ORDER_ROW', uid)
                    }
                }
            } else if (data.data == ORDER_STATUS_CANCELED) {
                // 취소됨
                rowEl.classList.remove('table-warning')
                statusEl.textContent = '취소됨'
            } else {

            }
        }
    }
}

async function refreshOrderStatusV2(uid, muid) {
    const getOrderStatusRes = await axios({
        method: 'post',
        url: '/api/getOrderStatusV2',
        headers: {
            Authorization: apitoken
        },
        data: {
            uid: uid,
            muid: muid
        }
    })
    const data = getOrderStatusRes.data
    if (data && data.success) {
        const rowEl = document.getElementById(`order-history-row-${uid}-${muid}`)
        if (rowEl) {
            const statusEl = rowEl.querySelector('#order-history-status')
            const btnEl = rowEl.querySelector('#order-history-compbtn')
            if (data.data == ORDER_STATUS_WAITING) {
                // 대기중
                rowEl.classList.add('table-warning')
                statusEl.textContent = '대기중'
                btnEl.classList.add('btn-primary')
                btnEl.classList.remove('btn-secondary')
                btnEl.textContent = '완료'
                btnEl.onclick = async () => {
                    if (await completeOrderV2(uid, muid)) {
                        refreshOrderStatusV2(uid, muid)
                        socket.emit('REQ_REFRESH_ORDER_ROW', `${uid}-${muid}`)
                    }
                }
            } else if (data.data == ORDER_STATUS_COMPLETE) {
                // 완료됨
                rowEl.classList.remove('table-warning')
                statusEl.textContent = '완료됨'
                btnEl.classList.remove('btn-primary')
                btnEl.classList.add('btn-secondary')
                btnEl.textContent = '대기'
                btnEl.onclick = async () => {
                    if (await incompleteOrderV2(uid, muid)) {
                        refreshOrderStatusV2(uid, muid)
                        socket.emit('REQ_REFRESH_ORDER_ROW', `${uid}-${muid}`)
                    }
                }
            } else if (data.data == ORDER_STATUS_CANCELED) {
                // 취소됨
                rowEl.classList.remove('table-warning')
                statusEl.textContent = '취소됨'
            } else {

            }
        }
    }
}

async function updateOrderHistory() {
    const getOrderHistoryRes = await axios({
        method: 'post',
        url: '/api/getOrderHistory',
        headers: {
            Authorization: apitoken
        }
    })
    const orderHistoryData = getOrderHistoryRes.data
    const orderHistoryContainerEl = document.getElementById('order-history-container')
    orderHistoryContainerEl.innerHTML = ''
    for (let i = 0; i < orderHistoryData.length; i++) {
        const tmp = orderHistoryData[i]
        let menuStr = ''
        let flag = false
        for (let j = 0; j < tmp.menu.length; j++) {
            if (tmp.menu[j].cnt) {
                if (j != 0 && flag) menuStr += '<br>'
                flag = true
                menuStr += `${tmp.menu[j].name}: ${convertNumber(tmp.menu[j].cnt)}`
            }
        }
        const orderHistoryNode = document.importNode(document.getElementById('order-history-row').content, true)
        const orderHistoryRowContainer = orderHistoryNode.getElementById('order-history-row-container')
        const orderHistorySeq = orderHistoryNode.getElementById('order-history-seq')
        const orderHistoryDate = orderHistoryNode.getElementById('order-history-date')
        const orderHistoryTime = orderHistoryNode.getElementById('order-history-time')
        const orderHistoryTablenum = orderHistoryNode.getElementById('order-history-tablenum')
        const orderHistoryMenuContainer = orderHistoryNode.getElementById('order-history-menu-container')
        const orderHistoryStatus = orderHistoryNode.getElementById('order-history-status')
        const orderHistoryCompBtn = orderHistoryNode.getElementById('order-history-compbtn')
        const orderHistoryCancelBtn = orderHistoryNode.getElementById('order-history-cancelbtn')

        orderHistoryRowContainer.id = `order-history-row-${tmp.id}`

        if (tmp.status == ORDER_STATUS_WAITING) {
            orderHistoryStatus.textContent = '대기중'
            orderHistoryRowContainer.classList.add('table-warning')
            orderHistoryCompBtn.textContent = '완료'
            orderHistoryCompBtn.onclick = async () => {
                if (await completeOrder(tmp.id)) {
                    refreshOrderStatus(tmp.id)
                    socket.emit('REQ_REFRESH_ORDER_ROW', tmp.id)
                }
            }
        } else if (tmp.status == ORDER_STATUS_COMPLETE) {
            orderHistoryStatus.textContent = '완료됨'
            orderHistoryCompBtn.textContent = '대기'
            orderHistoryCompBtn.classList.remove('btn-primary')
            orderHistoryCompBtn.classList.add('btn-secondary')
            orderHistoryCompBtn.onclick = async () => {
                if (await incompleteOrder(tmp.id)) {
                    refreshOrderStatus(tmp.id)
                    socket.emit('REQ_REFRESH_ORDER_ROW', tmp.id)
                }
            }
        } else if (tmp.status == ORDER_STATUS_CANCELED) {
            orderHistoryStatus.textContent = '취소됨'
        } else {

        }
        orderHistorySeq.textContent = orderHistoryData.length - i
        orderHistoryDate.textContent = convertDate(tmp.date, ONLY_DATE)
        orderHistoryTime.textContent = convertDate(tmp.date, ONLY_TIME)
        orderHistoryTablenum.textContent = tmp.tablenum
        orderHistoryContainerEl.appendChild(orderHistoryNode)
        orderHistoryMenuContainer.innerHTML = menuStr
    }
}

async function updateOrderHistoryV2() {
    const getOrderHistoryRes = await axios({
        method: 'post',
        url: '/api/getOrderHistoryV2',
        headers: {
            Authorization: apitoken
        }
    })
    const orderHistoryData = getOrderHistoryRes.data
    const orderHistoryContainerEl = document.getElementById('order-history-container')
    orderHistoryContainerEl.innerHTML = ''
    for (let i = 0; i < orderHistoryData.length; i++) {
        const tmp = orderHistoryData[i]
        let menuStr = `${tmp.name}: ${convertNumber(tmp.cnt)}`
        const orderHistoryNode = document.importNode(document.getElementById('order-history-row').content, true)
        const orderHistoryRowContainer = orderHistoryNode.getElementById('order-history-row-container')
        const orderHistorySeq = orderHistoryNode.getElementById('order-history-seq')
        const orderHistoryDate = orderHistoryNode.getElementById('order-history-date')
        const orderHistoryTime = orderHistoryNode.getElementById('order-history-time')
        const orderHistoryTablenum = orderHistoryNode.getElementById('order-history-tablenum')
        const orderHistoryMenuContainer = orderHistoryNode.getElementById('order-history-menu-container')
        const orderHistoryStatus = orderHistoryNode.getElementById('order-history-status')
        const orderHistoryCompBtn = orderHistoryNode.getElementById('order-history-compbtn')
        const orderHistoryCancelBtn = orderHistoryNode.getElementById('order-history-cancelbtn')

        orderHistoryRowContainer.id = `order-history-row-${tmp.ouid}-${tmp.muid}`

        if (tmp.status == ORDER_STATUS_WAITING) {
            orderHistoryStatus.textContent = '대기중'
            orderHistoryRowContainer.classList.add('table-warning')
            orderHistoryCompBtn.textContent = '완료'
            orderHistoryCompBtn.onclick = async () => {
                if (await completeOrderV2(tmp.ouid, tmp.muid)) {
                    refreshOrderStatusV2(tmp.ouid, tmp.muid)
                    socket.emit('REQ_REFRESH_ORDER_ROW', `${tmp.ouid}-${tmp.muid}`)
                }
            }
        } else if (tmp.status == ORDER_STATUS_COMPLETE) {
            orderHistoryStatus.textContent = '완료됨'
            orderHistoryCompBtn.textContent = '대기'
            orderHistoryCompBtn.classList.remove('btn-primary')
            orderHistoryCompBtn.classList.add('btn-secondary')
            orderHistoryCompBtn.onclick = async () => {
                if (await incompleteOrderV2(tmp.ouid, tmp.muid)) {
                    refreshOrderStatusV2(tmp.ouid, tmp.muid)
                    socket.emit('REQ_REFRESH_ORDER_ROW', `${tmp.ouid}-${tmp.muid}`)
                }
            }
        } else if (tmp.status == ORDER_STATUS_CANCELED) {
            orderHistoryStatus.textContent = '취소됨'
        } else {

        }
        orderHistorySeq.textContent = orderHistoryData.length - i
        orderHistoryDate.textContent = convertDate(tmp.date, ONLY_DATE)
        orderHistoryTime.textContent = convertDate(tmp.date, ONLY_TIME)
        orderHistoryTablenum.textContent = tmp.tablenum
        orderHistoryContainerEl.appendChild(orderHistoryNode)
        orderHistoryMenuContainer.innerHTML = menuStr
    }
}

async function updatePurchaseHistory() {
    const getPurchaseTotalRes = await axios({
        method: 'post',
        url: '/api/getPurchaseTotal',
        headers: {
            Authorization: apitoken
        }
    }) 
    const getPurchaseHistoryRes = await axios({
        method: 'post',
        url: '/api/getPurchaseHistory',
        headers: {
            Authorization: apitoken
        }
    })
    const purchaseHistoryData = getPurchaseHistoryRes.data
    const purchaseTotalData = getPurchaseTotalRes.data
    document.getElementById('p-history-total').textContent = `${convertNumber(purchaseTotalData.total)} 원`
    const purchaseHistoryContainerEl = document.getElementById('p-history-container')
    purchaseHistoryContainerEl.innerHTML = ''
    for (let i = 0; i < purchaseHistoryData.length; i++) {
        const tmp = purchaseHistoryData[i]
        let menuStr = ''
        let flag = false
        for (let j = 0; j < tmp.menu.length; j++) {
            if (tmp.menu[j].cnt) {
                if (j != 0 && flag) menuStr += '<br>'
                flag = true
                menuStr += `${tmp.menu[j].name}: ${convertNumber(tmp.menu[j].cnt)}`
            }
        }
        const purchaseHistoryNode = document.importNode(document.getElementById('p-history-row').content, true)
        const purchaseHistoryRowContainer = purchaseHistoryNode.getElementById('p-history-row-container')
        const purchaseHistorySeq = purchaseHistoryNode.getElementById('p-history-seq')
        const purchaseHistoryDateStartDate = purchaseHistoryNode.getElementById('p-history-date-s')
        const purchaseHistoryDateStartTime = purchaseHistoryNode.getElementById('p-history-time-s')
        const purchaseHistoryDateEndDate = purchaseHistoryNode.getElementById('p-history-date-e')
        const purchaseHistoryDateEndTime = purchaseHistoryNode.getElementById('p-history-time-e')
        const purchaseHistoryTablenum = purchaseHistoryNode.getElementById('p-history-tablenum')
        const purchaseHistoryMenuContainer = purchaseHistoryNode.getElementById('p-history-menu-container')
        const purchaseHistoryAmount = purchaseHistoryNode.getElementById('p-history-amount')

        purchaseHistoryRowContainer.id = `purchase-history-row-${tmp.id}`

        purchaseHistorySeq.textContent = purchaseHistoryData.length - i
        purchaseHistoryDateStartDate.textContent = convertDate(tmp.entrytime, ONLY_DATE)
        purchaseHistoryDateStartTime.textContent = convertDate(tmp.entrytime, ONLY_TIME)
        purchaseHistoryDateEndDate.textContent = convertDate(tmp.exittime, ONLY_DATE)
        purchaseHistoryDateEndTime.textContent = convertDate(tmp.exittime, ONLY_TIME)
        purchaseHistoryTablenum.textContent = tmp.tablenum
        purchaseHistoryContainerEl.appendChild(purchaseHistoryNode)
        purchaseHistoryMenuContainer.innerHTML = menuStr
        purchaseHistoryAmount.textContent = `${convertNumber(tmp.amount)} 원`
    }
}

const TABLES = new Map()

async function updateTableStatus() {
    resetOrderSheet()
    TABLES.clear()
    const getTablesRes = await axios({
        method: 'post',
        url: '/api/getTables',
        headers: {
            Authorization: apitoken
        }
    })
    const tableData = getTablesRes.data?.data
    for (let i = 0; i < tableData.length; i++) {
        TABLES.set(tableData[i].tablenum, {
            id: tableData[i].id,
            date: tableData[i].date,
            type: tableData[i].type
        })
    }

    var tableContainerEl = document.getElementById('table-container')
    tableContainerEl.innerHTML = ''
    for (let i = 1; i <= 20; i++) {
        const isBlank = !TABLES.has(i)
        var colEl = document.createElement('div')
        colEl.classList.add('col')
        var cardEl = document.createElement('div')
        cardEl.classList.add('card')
        cardEl.style.cursor = 'pointer'
        if (oSelectedTable == i) cardEl.classList.add('text-bg-success')
        var cardBodyEl = document.createElement('div')
        cardBodyEl.classList.add('card-body')
        var h5El = document.createElement('h5')
        h5El.classList.add('card-title')
        h5El.textContent = `# ${i}`
        var pEl = document.createElement('p')
        pEl.classList.add('card-text')
        if (isBlank) {
            pEl.textContent = '빈자리'
        } else {
            const date = convertDate(TABLES.get(i).date, ONLY_TIME)
            if (oSelectedTable != i) cardEl.classList.add('border-danger')
            pEl.textContent = date
        }
        cardBodyEl.appendChild(h5El)
        cardBodyEl.appendChild(pEl)
        cardEl.appendChild(cardBodyEl)
        cardEl.onclick = function() {
            var unselectBtnEl = document.getElementById('unselect-btn')
            unselectBtnEl.disabled = false
            oSelectedTable = i
            updateTableStatus()
        }
        colEl.appendChild(cardEl)
        tableContainerEl.appendChild(colEl)
    }

    const tableInfoNumberTextEl = document.getElementById('table-info-number-text')
    const tableInfoSecondaryEl = document.getElementById('table-info-secondary')
    const tableInfoDateEl = document.getElementById('table-info-date')
    const tableInfoStatusEl = document.getElementById('table-info-status')
    if (oSelectedTable == 0) {
        tableInfoNumberTextEl.textContent = '테이블을 선택해주세요'
        tableInfoSecondaryEl.style.display = 'none'
        tableInfoStatusEl.style.display = 'none'
    } else {
        tableInfoNumberTextEl.textContent = `${oSelectedTable}번 테이블`
        tableInfoSecondaryEl.style.display = 'block'
        tableInfoStatusEl.style.display = 'inline'
        if (TABLES.has(oSelectedTable)) {
            const temp = TABLES.get(oSelectedTable)
            tableInfoDateEl.textContent = convertDate(temp.date, FULL_DATE)
            tableInfoStatusEl.textContent = '사용중'
            tableInfoStatusEl.style.color = 'red'
            tableInfoStatusEl.style.opacity = '100%'
        } else {
            tableInfoDateEl.textContent = '첫 주문 시 자동으로 입력됩니다.'
            tableInfoStatusEl.textContent = '비어있음'
            tableInfoStatusEl.style.color = 'black'
            tableInfoStatusEl.style.opacity = '50%'
        }
    }
}



let pSelectedTable = 0
const pInfo = {
    sessionid: null,
    entrytime: null,
    tablenum: null,
    menu: [],
    amount: null
}

async function drawPurchaseTables() {
    const res = await axios({
        method: 'post',
        url: '/api/getSessions',
        headers: {
            Authorization: apitoken
        }
    })
    const sessions = res.data.data
    const purchaseTableContainerEl = document.getElementById('purchase-table-container')
    purchaseTableContainerEl.innerHTML = ''
    let flag = false
    for (let i = 0; i < sessions.length; i++) {
        const node = document.importNode(document.getElementById('p-table-cel').content, true)
        const cardEl = node.getElementById('card')
        if (sessions[i].tablenum == pSelectedTable) {
            cardEl.classList.add('text-bg-success')
            flag = true
            settingPurchaseInfo(sessions[i].id)
        }
        const numberEl = node.getElementById('table-num')
        numberEl.textContent = sessions[i].tablenum
        const dateEl = node.getElementById('date')
        dateEl.textContent = convertDate(sessions[i].date, ONLY_TIME)
        cardEl.onclick = () => {
            const unselectBtnEl = document.getElementById('purchase-unselect-btn')
            unselectBtnEl.disabled = false
            pSelectedTable = sessions[i].tablenum
            pInfo.sessionid = sessions[i].id
            pInfo.entrytime = sessions[i].date
            pInfo.tablenum = sessions[i].tablenum
            drawPurchaseTables()
            settingPurchaseInfo(sessions[i].id)
            togglePurchaseInfo()

            // RIGHT INFO SETTING

        }
        purchaseTableContainerEl.appendChild(node)
    }
    if (!flag) {
        var unselectBtnEl = document.getElementById('purchase-unselect-btn')
        pSelectedTable = 0
        unselectBtnEl.disabled = true
        pSelectedTable = 0
        togglePurchaseInfo()
    }
}

function purchaseUnselectClick() {
    var unselectBtnEl = document.getElementById('purchase-unselect-btn')
    pSelectedTable = 0
    unselectBtnEl.disabled = true
    drawPurchaseTables()
    togglePurchaseInfo()
}

function togglePurchaseInfo() {
    const tableTitle = document.getElementById('p-table-number')
    const tableSecondary = document.getElementById('p-info-secondary')
    if (pSelectedTable == 0) {
        tableTitle.textContent = '테이블을 선택해주세요'
        tableSecondary.style.display = 'none'
    } else {
        tableSecondary.style.display = 'block'
    }
}

function settingPeopleEvent() {
    const people4El = document.getElementById('people-radio-4')
    const people6El = document.getElementById('people-radio-6')
    const radios = [people4El, people6El]
    radios.forEach((rd) => {
        rd.addEventListener("change", (e) => {
            const current = e.currentTarget
            if (current.checked) {
                peopleCnt = parseInt(current.value)
                pInfoSetting()
            }
        })
    })
}

function convertTest(hour, minute) {
    const val = hour * 3600 + minute * 60
    const unit = 4000
    let tmp = unit
    if (val - 3960 >= 0) tmp += (Math.floor((val - 3960) / 1800) + 1) * (unit / 2)
    return `${convertNumber(tmp)}원`
}

function convertSecond(sec, offset = false) {
    const val = parseInt(sec)
    if (isNaN(val)) return '00시간 00분'
    if (offset) {
        if (val - 3960 >= 0) {
            const tmp = val - 3960
            const unitTime = Math.floor(tmp / 1800)
            const hour = Math.floor(unitTime / 2).toString().padStart(2, '0')
            const minute = ((unitTime % 2) * 30).toString().padStart(2, '0')
            return `${hour}시간 ${minute}분`
        } else {
            return '00시간 00분'
        }
    } else {
        const hour = Math.floor(val / 3600).toString().padStart(2, '0')
        const minute = Math.floor((val % 3600) / 60).toString().padStart(2, '0')
        return `${hour}시간 ${minute}분`
    }
}

let peopleCnt = 4

function adjustmentPrice(time) {
    const unit = peopleCnt * 1000
    let tmp = unit
    if (time - 3960 >= 0) tmp += (Math.floor((time - 3960) / 1800) + 1) * (unit / 2)
    pInfo.fee = tmp
}

function pInfoSetting() {
    const pTotalPriceEl = document.getElementById('p-total-price')
    const pElapsedTimeEl = document.getElementById('p-elapsed-time')
    const pFeeEl = document.getElementById('p-fee')
    adjustmentPrice(pInfo.elapsedTime)
    pTotalPriceEl.textContent = `${convertNumber(pInfo.amount + pInfo.fee)}원`
    pElapsedTimeEl.textContent = convertSecond(pInfo.elapsedTime, true)
    pFeeEl.textContent = convertNumber(pInfo.fee)
}

async function settingPurchaseInfo(uid) {
    controlPeople(false, 4)
    const tableTitle = document.getElementById('p-table-number')
    const tableSubTitle = document.getElementById('p-table-status')
    const tableSecondary = document.getElementById('p-info-secondary')
    const tableEntryTime = document.getElementById('p-info-time')
    const tableEndTime = document.getElementById('p-info-time-e')
    tableTitle.textContent = `${pSelectedTable}번 테이블`
    const targetTime = new Date(pInfo.entrytime)
    pInfo.endtime = new Date()
    const rawTime = pInfo.endtime - targetTime
    pInfo.elapsedTime = Math.floor(rawTime / 1000)
    tableEntryTime.textContent = convertDate(pInfo.entrytime, FULL_DATE)
    tableEndTime.textContent = convertSecond(pInfo.elapsedTime)
    const res = await axios({
        method: 'post',
        url: '/api/getSessionInfo',
        data: {
            uid: uid
        },
        headers: {
            Authorization: apitoken
        }
    })
    if (res.data && res.data.success) {
        pInfo.menu.length = 0
        const menus = res.data.menus
        const pMenuContainerEl = document.getElementById('p-menu-container')
        const pTotalPriceEl = document.getElementById('p-total-price')
        pMenuContainerEl.innerHTML = ''
        let total = 0
        for (let i = 0; i < menus.length; i++) {
            const node = document.importNode(document.getElementById('p-menu-row').content, true)
            node.getElementById('p-menu-title').textContent = MENU.get(menus[i].id).name
            node.getElementById('p-menu-price').textContent = `${convertNumber(MENU.get(menus[i].id).price)} 원`
            total += MENU.get(menus[i].id).price * menus[i].cnt
            node.getElementById('p-menu-cnt').textContent = convertNumber(menus[i].cnt)
            pMenuContainerEl.appendChild(node)
            pInfo.menu.push({
                id: menus[i].id,
                cnt: menus[i].cnt
            })
        }
        pInfo.amount = total
        pInfoSetting()
    }
}

function requestPurchase() {
    Swal.fire({
        title: "결제처리할까요?",
        text: "금액을 다시 한 번 확인해주세요",
        showDenyButton: true,
        icon: 'question',
        confirmButtonText: "확인",
        denyButtonText: "취소",
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            const res = await axios({
                method: 'post',
                url: '/api/purchase',
                headers: {
                    Authorization: apitoken
                },
                data: pInfo
            })
            if (res) {
                updateTableStatus()
                drawPurchaseTables()
                updatePurchaseHistory()
                socket.emit('REQ_REFRESH_PURCHASE')
            }
        }
    })
}

async function completeOrder(uid) {
    const res = await axios({
        method: 'post',
        url: '/api/controlOrder',
        headers: {
            Authorization: apitoken
        },
        data: {
            uid: uid,
            type: 2
        }
    })
    if (res.data?.success) return res.data.success
    else return false
}

async function incompleteOrder(uid) {
    const res = await axios({
        method: 'post',
        url: '/api/controlOrder',
        headers: {
            Authorization: apitoken
        },
        data: {
            uid: uid,
            type: 1
        }
    })
    if (res.data?.success) return res.data.success
    else return false
}

async function completeOrderV2(uid, muid) {
    const res = await axios({
        method: 'post',
        url: '/api/controlOrderV2',
        headers: {
            Authorization: apitoken
        },
        data: {
            uid: uid,
            muid: muid,
            type: 2
        }
    })
    if (res.data?.success) return res.data.success
    else return false
}

async function incompleteOrderV2(uid, muid) {
    const res = await axios({
        method: 'post',
        url: '/api/controlOrderV2',
        headers: {
            Authorization: apitoken
        },
        data: {
            uid: uid,
            muid: muid,
            type: 1
        }
    })
    if (res.data?.success) return res.data.success
    else return false
}

async function addMenu() {
    const nameEl = document.getElementById('menu-name-input')
    const priceEl = document.getElementById('menu-price-input')
    const name = nameEl.value
    const price = parseInt(priceEl.value)
    if (!name || name == "") {
        Swal.fire({
            title: '이름 오류',
            text: '올바른 이름을 입력해주세요',
            icon: 'error',
            timer: 1500,
            showConfirmButton: false
        })
    } else if (!price || isNaN(price)) {
        Swal.fire({
            title: '가격 오류',
            text: '올바른 수를 입력해주세요',
            icon: 'error',
            timer: 1500,
            showConfirmButton: false
        })
    } else {
        Swal.fire({
            title: "메뉴 등록중",
            text: "잠시만 기다려주세요",
            icon: "info",
            showConfirmButton: false,
            allowOutsideClick: false
        });
        const addMenuRes = await axios({
            method: 'post',
            url: '/api/addMenu',
            headers: {
                Authorization: apitoken
            },
            data: {
                name: name,
                price: price
            }
        })
        const addMenuData = addMenuRes.data
        if (!addMenuData || !addMenuData.success) {
            Swal.fire({
                title: 'API 오류',
                text: addMenuData.error,
                icon: 'error',
                timer: 1500,
                showConfirmButton: false
            })
        } else {
            socket.emit('REQ_REFRESH_MENU')
            updateMenuList(false)
            Swal.fire({
                title: '메뉴 추가됨',
                text: '메뉴가 정상적으로 추가되었습니다',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            })
        }
    }
}

async function editMenu(id) {
    const nameEl = document.getElementById('edit-menu-name-input')
    const priceEl = document.getElementById('edit-menu-price-input')
    const name = nameEl.value
    const price = parseInt(priceEl.value)
    if (name && name != "" && !isNaN(price)) {
        const editMenuRes = await axios({
            method: 'post',
            url: '/api/editMenu',
            headers: {
                Authorization: apitoken
            },
            data: {
                id: id,
                name: name,
                price: price
            }
        })
        if (editMenuRes.data.success) {
            socket.emit('REQ_REFRESH_MENU')
            updateMenuList()
            await Swal.fire({
                title: '메뉴 수정 완료',
                text: '메뉴가 수정되었습니다',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            })
        } else {
            Swal.fire({
                title: '메뉴 수정 오류',
                text: '오류가 발생했습니다',
                icon: 'error',
                timer: 1500,
                showConfirmButton: false
            })
        }
    }
}

const MENU = new Map()

const orderSheet = new Map()

function resetOrderSheet() {
    orderSheet.clear()
    const orderMenuContainerEl = document.getElementById('order-menu-container')
    orderMenuContainerEl.innerHTML = ''
    for (const [key, value] of MENU) {
        const orderMenuNode = document.importNode(document.querySelector('#order-menu-row').content, true)
        orderMenuNode.querySelector('#order-menu-title').textContent = value.name
        orderMenuNode.querySelector('#order-menu-price').textContent = `${convertNumber(value.price)} 원`
        orderMenuNode.getElementById('order-menu-input').id = `order-menu-input-${key}`
        orderMenuNode.getElementById('order-menu-minus').onclick = () => {orderCountMinus(key)}
        orderMenuNode.getElementById('order-menu-plus').onclick = () => {orderCountPlus(key)}
        orderMenuContainerEl.appendChild(orderMenuNode)
        orderSheet.set(key, 0)
    }
}

function updateOrderCountInput(key) {
    const inputEl = document.getElementById(`order-menu-input-${key}`)
    if (inputEl) {
        if (orderSheet.has(key)) {
            inputEl.value = orderSheet.get(key)
        }
    }
}

function orderCountPlus(key) {
    if (orderSheet.has(key)) {
        const target = parseInt(orderSheet.get(key))
        if (!isNaN(target)) {
            orderSheet.set(key, target + 1)
            updateOrderCountInput(key)
        }
    }
}

function orderCountMinus(key) {
    if (orderSheet.has(key)) {
        const target = parseInt(orderSheet.get(key))
        if (!isNaN(target)) {
            orderSheet.set(key, target - 1)
            updateOrderCountInput(key)
        }
    }
}

async function updateMenuList(modalFlag = true) {
    if (modalFlag) {
        Swal.fire({
            title: "메뉴 가져오는중",
            text: "잠시만 기다려주세요",
            icon: "info",
            showConfirmButton: false,
            allowOutsideClick: false
        });
    }
    MENU.clear()
    const getMenuRes = await axios({
        method: 'post',
        url: '/api/getMenu',
        headers: {
            Authorization: apitoken
        }
    })
    const getMenuData = getMenuRes.data
    if (!getMenuData || !getMenuData.success) {
        if (modalFlag) {
            Swal.fire({
                title: '오류',
                text: '메뉴를 가져오지 못했습니다',
                icon: 'error',
                timer: 1500,
                showConfirmButton: false
            })
        }
    } else {
        for (let i = 0; i < getMenuData.data.length; i++) {
            MENU.set(getMenuData.data[i].id, {
                name: getMenuData.data[i].name,
                price: getMenuData.data[i].price
            })
        }
        var menuContainerEl = document.getElementById('menu-container')
        menuContainerEl.innerHTML = ''
        const editMenuModal = new bootstrap.Modal('#editMenuModal')
        const editMenuUidTextEl = document.getElementById('edit-menu-uid-text')
        const editMenuNameInputEl = document.getElementById('edit-menu-name-input')
        const editMenuPriceInputEl = document.getElementById('edit-menu-price-input')
        const editMenuBtn = document.getElementById('edit-menu-btn')
        for (const [key, value] of MENU) {
            var colEl = document.createElement('div')
            colEl.classList.add('col')
            var cardEl = document.createElement('div')
            cardEl.classList.add('card')
            cardEl.style.cursor = 'pointer'
            cardEl.onclick = () => {
                editMenuUidTextEl.textContent = key
                editMenuNameInputEl.value = value.name
                editMenuPriceInputEl.value = value.price
                editMenuBtn.onclick = () => {
                    editMenu(key)
                    editMenuModal.hide()
                }
                editMenuModal.show()
            }
            var cardBodyEl = document.createElement('div')
            cardBodyEl.classList.add('card-body')
            var h5El = document.createElement('h5')
            h5El.classList.add('card-title')
            h5El.textContent = value.name
            var pEl = document.createElement('p')
            pEl.classList.add('card-text')
            pEl.textContent = `${convertNumber(value.price)} 원`
            cardBodyEl.appendChild(h5El)
            cardBodyEl.appendChild(pEl)
            cardEl.appendChild(cardBodyEl)
            colEl.appendChild(cardEl)
            menuContainerEl.appendChild(colEl)
        }
        if (modalFlag) Swal.close()
    }
}

socket.on('REQ_REFRESH_MENU', async () => {
    await updateMenuList()
    resetOrderSheet()
    updateTableStatus()
})

socket.on('REQ_REFRESH_TABLE', () => {
    updateTableStatus()
    updateOrderHistoryV2()
    drawPurchaseTables()
})

socket.on('REQ_REFRESH_ORDER_ROW', (id) => {
    const tmp = id.split('-')
    refreshOrderStatusV2(tmp[0], tmp[1])
})

socket.on('REQ_REFRESH_PURCHASE', () => {
    drawPurchaseTables()
    updateTableStatus()
    updatePurchaseHistory()
})

let apitoken = null

async function checkToken() {
    const keyStatusEl = document.getElementById('key-status')
    const keyInputEl = document.getElementById('key-input')
    const keyBtnEl = document.getElementById('key-btn')
    const res = await axios({
        method: 'post',
        url: '/api/checkToken',
        data: {
            token: apitoken
        }
    })
    if (res.data?.success) {
        keyStatusEl.textContent = '인증되었습니다.'
        keyStatusEl.style.color = 'green'
        keyStatusEl.style.fontWeight = 'bold'
        keyInputEl.disabled = true
        keyBtnEl.disabled = true
        await updateMenuList()
        drawPurchaseTables()
        togglePurchaseInfo()
        updateTableStatus()
        updateOrderHistoryV2()
        updatePurchaseHistory()
        resetOrderSheet()
    } else {
        keyStatusEl.textContent = '인증이 필요합니다.'
        keyStatusEl.style.color = 'red'
        keyStatusEl.style.fontWeight = 'bold'
        keyInputEl.disabled = false
        keyBtnEl.disabled = false
    }
}

window.onload = async function() {
    const keyInputEl = document.getElementById('key-input')
    const keyBtnEl = document.getElementById('key-btn')
    let query = window.location.search;
    let param = new URLSearchParams(query);
    let key = param.get('key');
    if (key && key != '') keyInputEl.value = key
    keyBtnEl.onclick = async () => {
        const res = await axios({
            method: 'post',
            url: '/api/getToken',
            data: {
                pw: keyInputEl.value
            }
        })
        if (res.data?.token) {
            apitoken = res.data.token
        }
        checkToken()
    }
    settingPeopleEvent()
}