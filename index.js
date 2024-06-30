const express = require('express')
const { createServer } = require('node:http')
const { join } = require('node:path')
const { Server } = require('socket.io')
const { v4: uuidv4 } = require('uuid')
const { DBHelper } = require('./utils/DBHelper')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.static('public'))
app.use(express.json({ extended: true }))
app.use(express.urlencoded({ extended: false }))
const server = createServer(app)
const io = new Server(server)

const dbHelper = new DBHelper()

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'pages', 'index.html'))
})

function verifyToken(token) {
    try {
        jwt.verify(token, 'tempjumak')
        return true
    } catch (e) {

    }
    return false
}

// ######################################

app.post('/api/purchase', async (req, res) => {
    if (verifyToken(req?.headers.authorization)) {
        await dbHelper.requestPurchase(req.body)
    }
    res.status(200).json({})
})

app.post('/api/getSessions', async (req, res) => {
    const result = { success: false }
    if (verifyToken(req?.headers.authorization)) {
        const sessions = await dbHelper.getSessions()
        result.success = true
        result.data = sessions
    }
    res.status(200).json(result)
})

app.post('/api/getSessionInfo', async (req, res) => {
    const uid = req.body.uid
    const result = { success: false }
    if (uid) {
        if (verifyToken(req?.headers.authorization)) {
            const info = await dbHelper.getSessionInfo(uid)
            if (info) {
                result.success = true
                result.menus = info
            }
        }
    }
    res.status(200).json(result)
})

app.post('/api/getToken', async (req, res) => {
    const pw = req.body.pw
    const result = { success: false }
    if (pw && pw == 'apkr3134') {
        result.success = true
        result.token = jwt.sign({}, 'tempjumak')
    }
    res.status(200).json(result)
})

app.post('/api/checkToken', async (req, res) => {
    const token = req.body.token
    const result = { success: false }
    if (token) {
        if (verifyToken(token)) {
            result.success = true
        }
    }
    res.status(200).json(result)
})

app.post('/api/getOrderStatus', async (req, res) => {
    const uid = req.body.uid
    const result = { success: false }
    if (uid) {
        if (verifyToken(req?.headers.authorization)) {
            const getRes = await dbHelper.getOrderStatus(uid)
            if (getRes[0]?.status) {
                result.success = true
                result.data = getRes[0].status
            }
        }
    }
    res.status(200).json(result)
})

app.post('/api/getOrderStatusV2', async (req, res) => {
    const uid = req.body.uid
    const muid = req.body.muid
    const result = { success: false }
    if (uid && muid) {
        if (verifyToken(req?.headers.authorization)) {
            const getRes = await dbHelper.getOrderStatusV2(uid, muid)
            if (getRes[0]?.status) {
                result.success = true
                result.data = getRes[0].status
            }
        }
    }
    res.status(200).json(result)
})

app.post('/api/controlOrder', async (req, res) => {
    const uid = req.body.uid
    const type = req.body.type
    const result = { success: false }
    if (uid && type) {
        if (verifyToken(req?.headers.authorization)) {
            if (await dbHelper.controlOrder(uid, type)) result.success = true
        }
    }
    res.status(200).json(result)
})

app.post('/api/controlOrderV2', async (req, res) => {
    const uid = req.body.uid
    const muid = req.body.muid
    const type = req.body.type
    const result = { success: false }
    if (uid && muid && type) {
        if (verifyToken(req?.headers.authorization)) {
            if (await dbHelper.controlOrderV2(uid, muid, type)) result.success = true
        }
    }
    res.status(200).json(result)
})

app.post('/api/getOrderHistory', async (req, res) => {
    if (verifyToken(req?.headers.authorization)) {
        const orderHistory = await dbHelper.getOrderHistory()
        const orderDetail = await dbHelper.getOrderDetail(orderHistory.map((el) => el.id))
        if (orderHistory.length == orderDetail.length) {
            for (let i = 0; i < orderHistory.length; i++) orderHistory[i].menu = orderDetail[i]
        }   
        res.status(200).json(orderHistory)
    } else {
        res.status(200).json([])
    }
})

app.post('/api/getOrderHistoryV2', async (req, res) => {
    if (verifyToken(req?.headers.authorization)) {
        const orderHistory = await dbHelper.getOrderHistoryV2()  
        res.status(200).json(orderHistory)
    } else {
        res.status(200).json([])
    }
})

app.post('/api/getPurchaseHistory', async (req, res) => {
    if (verifyToken(req?.headers.authorization)) {
        const purchaseHistory = await dbHelper.getPurchaseHistory()
        const purchaseDetail = await dbHelper.getPurchaseDetail(purchaseHistory.map((el) => el.id))
        if (purchaseHistory.length == purchaseDetail.length) {
            for (let i = 0; i < purchaseHistory.length; i++) purchaseHistory[i].menu = purchaseDetail[i]
        }
        res.status(200).json(purchaseHistory)
    } else {
        res.status(200).json([])
    }
})

app.post('/api/requestOrder', async (req, res) => {
    const result = { success: false }
    if (verifyToken(req?.headers.authorization)) {
        const orderRes = await dbHelper.requestOrder(req.body)
        if (orderRes) {
            result.success = true
            if (orderRes == 1) result.type = 'new'
            else if (orderRes == 2) result.type = 'exist'
        }
    }
    res.status(200).json(result)
})

app.post('/api/getMenu', (req, res) => {
    if (verifyToken(req?.headers.authorization)) {
        dbHelper.getMenu().catch((e) => {
            res.status(200).json({
                success: false,
                error: e.toString()
            })
        }).then((execRes) => {
            const result = { success: false }
            if (execRes) result.success = true
            result.data = execRes
            res.status(200).json(result)
        })
    } else {
        res.status(200).json({ success: false })
    }
})

app.post('/api/getPurchaseTotal', async (req, res) => {
    const result = { success: false }
    if (verifyToken(req?.headers.authorization)) {
        const totalData = await dbHelper.getPurchaseTotal()
        if (totalData) {
            result.success = true
            result.total = totalData
        }
    }
    res.status(200).json(result)
})

app.post('/api/addMenu', (req, res) => {
    const menuName = req.body.name
    const menuPrice = req.body.price
    const result = { success: false }
    if (verifyToken(req?.headers.authorization)) {
        if (!menuName || !menuPrice || isNaN(menuPrice)) {
            res.status(200).json(result)
        } else {
            dbHelper.addMenu(menuName, menuPrice).catch((e) => {
                result.success = false
                result.error = e.toString()
            }).then((execRes) => {
                if (execRes.success) result.success = true
                else {
                    result.success = false
                    result.error = execRes.reason
                }
                res.status(200).json(result)
            })
        }
    } else {
        res.status(200).json(result)
    }
})

app.post('/api/editMenu', async (req, res) => {
    const result = { success: false }
    const menuID = req.body.id
    const menuName = req.body.name
    const menuPrice = req.body.price
    if (verifyToken(req?.headers.authorization)) {
        if (await dbHelper.editMenu(menuID, menuName, menuPrice)) {
            result.success = true
        }
    }
    res.status(200).json(result)
})

app.post('/api/getTables', async (req, res) => {
    const result = { success: false }
    if (verifyToken(req?.headers.authorization)) {
        const tableData = await dbHelper.getTables()
        if (tableData) {
            result.success = true
            result.data = tableData
        }
    }
    res.status(200).json(result)
})

// ######################################

io.on('connection', (socket) => {
    console.log('NEW CONNECTION')

    socket.on('REQ_REFRESH_MENU', () => {
        io.emit('REQ_REFRESH_MENU')
    })

    socket.on('REQ_REFRESH_TABLE', () => {
        socket.broadcast.emit('REQ_REFRESH_TABLE')
    })

    socket.on('REQ_REFRESH_ORDER_ROW', (data) => {
        socket.broadcast.emit('REQ_REFRESH_ORDER_ROW', data)
    })

    socket.on('REQ_REFRESH_PURCHASE', () => {
        socket.broadcast.emit('REQ_REFRESH_PURCHASE')
    })
})

server.listen(5000, async () => {
    console.log('Server Started')
})