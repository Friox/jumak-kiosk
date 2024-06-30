const mysql = require('mysql2/promise')
const { v4: uuidv4 } = require('uuid')

const pool = mysql.createPool({
    host: process.env.DB_URL,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 5000
})

class DBHelper {
    constructor() {}

    async getSessions() {
        const conn = await pool.getConnection()
        if (conn) {
            try {
                const [results] = await conn.query('SELECT * FROM Session ORDER BY tablenum')
                return results
            } catch (e) {
                return []
            } finally {
                conn.release()
            }
        } else {
            return []
        }
    }

    async getSessionInfo(uid) {
        const conn = await pool.getConnection()
        if (conn) {
            try {
                const [results] = await conn.query('SELECT m.id, SUM(od.cnt) AS cnt FROM `Session` s INNER JOIN `Order` o ON s.id = o.sessionuid INNER JOIN `OrderDetail` od ON o.id = od.orderuid INNER JOIN `Menu` m ON od.menuuid = m.id WHERE s.id = ? GROUP BY m.id', [uid])
                return results
            } catch (e) {
                console.log(e)
                return []
            } finally {
                conn.release()
            }
        } else {
            return []
        }
    }

    async requestOrder(data) {
        const tableNum = data?.tablenum
        const orders = data?.orders
        const tableType = data?.tabletype
        let result = 0
        if (!tableNum || !orders || !tableType) return result
        const conn = await pool.getConnection()
        let sessionid = null
        if (conn) {
            try {
                const [results] = await conn.query('SELECT `id` FROM Session WHERE `tablenum` = ?', tableNum)
                if (results.length == 1) sessionid = results[0].id
            } catch (e) {
                return result
            } finally {
                conn.release()
            }
        }
        if (!sessionid) {
            const sessionUUID = uuidv4().replace(/-/g, '').substring(0, 16)
            const orderUUID = uuidv4().replace(/-/g, '').substring(0, 16)
            if (conn) {
                try {
                    await conn.beginTransaction()
                    await conn.query('INSERT INTO Session (id, date, tablenum, type) VALUES (?, CONVERT_TZ(NOW(), \'+00:00\', \'+09:00\'), ?, ?)', [sessionUUID, tableNum, tableType])
                    await conn.query('INSERT INTO `Order` (id, sessionuid, date, status, tablenum) VALUES (?, ?, CONVERT_TZ(NOW(), \'+00:00\', \'+09:00\'), 1, ?)', [orderUUID, sessionUUID, tableNum])
                    
                    for (let key in orders) {
                        if (orders[key] == 0) continue
                        await conn.query('INSERT INTO OrderDetail (orderuid, menuuid, cnt) VALUES (?, ?, ?)', [orderUUID, key, orders[key]])
                    }
                    
                    await conn.commit()
                    return 1
                } catch (e) {
                    console.log(e)
                    await conn.rollback()
                } finally {
                    conn.release()
                }
            }
        } else {
            // 추가주문
            const orderUUID = uuidv4().replace(/-/g, '').substring(0, 16)
            if (conn) {
                try {
                    await conn.beginTransaction()
                    // await conn.query('INSERT INTO Session (id, date, tablenum) VALUES (?, CONVERT_TZ(NOW(), \'+00:00\', \'+09:00\'), ?)', [sessionUUID, tableNum])
                    await conn.query('INSERT INTO `Order` (id, sessionuid, date, status, tablenum) VALUES (?, ?, CONVERT_TZ(NOW(), \'+00:00\', \'+09:00\'), 1, ?)', [orderUUID, sessionid, tableNum])
                    
                    for (let key in orders) {
                        if (orders[key] == 0) continue
                        await conn.query('INSERT INTO OrderDetail (orderuid, menuuid, cnt) VALUES (?, ?, ?)', [orderUUID, key, orders[key]])
                    }
                    
                    await conn.commit()
                    return 2
                } catch (e) {
                    console.log(e)
                    await conn.rollback()
                } finally {
                    conn.release()
                }
            }
        }
    }

    async controlOrder(uid, type) {
        let res = false
        const conn = await pool.getConnection()
        if (conn) {
            try {
                const [results] = await conn.query('UPDATE `Order` SET status = ? WHERE id = ?', [type, uid])
                if (results.affectedRows == 1) res = true
            } catch (e) {
                res = false
            } finally {
                conn.release()
            }
        }
        return res
    }

    async controlOrderV2(ouid, muid, type) {
        let res = false
        const conn = await pool.getConnection()
        if (conn) {
            try {
                const [results] = await conn.query('UPDATE OrderDetail SET status = ? WHERE orderuid = ? AND menuuid = ?', [type, ouid, muid])
                if (results.affectedRows == 1) res = true
            } catch (e) {
                res = false
            } finally {
                conn.release()
            }
        }
        return res
    }

    async getTables() {
        const conn = await pool.getConnection()
        if (conn) {
            try {
                const [results] = await conn.query('SELECT * FROM Session')
                return results
            } catch (e) {

            } finally {
                conn.release()
            }
        }
    }

    async getOrderHistory() {
        const conn = await pool.getConnection()
        if (conn) {
            try {
                const [results] = await conn.query('SELECT * FROM `Order` ORDER BY date DESC')
                return results
            } catch (e) {
                console.log(e)
            } finally {
                conn.release()
            }
        }
    }

    async getOrderHistoryV2() {
        const conn = await pool.getConnection()
        if (conn) {
            try {
                const [results] = await conn.query('SELECT o.id ouid, m.id muid, o.date, od.status, o.tablenum, m.name, od.cnt FROM `Order` o INNER JOIN OrderDetail od ON o.id = od.orderuid INNER JOIN Menu m ON od.menuuid = m.id ORDER BY o.date DESC, m.prio ASC')
                return results
            } catch (e) {
                console.log(e)
            } finally {
                conn.release()
            }
        }
    }

    async getOrderDetail(ids) {
        const res = []
        const conn = await pool.getConnection()
        if (conn) {
            try {
                for (let id of ids) {
                    const [results] = await conn.query('SELECT m.name, od.cnt FROM `Order` o INNER JOIN OrderDetail od ON o.id = od.orderuid INNER JOIN Menu m ON od.menuuid = m.id WHERE o.id = ?', [id])
                    res.push(results)
                }
            } catch (e) {
                res.length = 0
                console.log(e)
            } finally {
                conn.release()
            }
        }
        return res
    }

    async getOrderDetails(ouid, muid) {

    }

    async getPurchaseTotal() {
        const conn = await pool.getConnection()
        if (conn) {
            try {
                const [results] = await conn.query('SELECT SUM(amount) AS total FROM PurchaseHistory')
                return results[0].total
            } catch (e) {
                console.log(e)
                return null
            } finally {
                conn.release()
            }
        }
        return null
    }

    async editMenu(uid, name, price) {
        const conn = await pool.getConnection()
        if (conn) {
            try {
                await conn.query('UPDATE Menu SET name = ?, price = ? WHERE id = ?', [name, price, uid])
                return true
            } catch (e) {
                console.log(e)
            } finally {
                conn.release()
            }
        }
        return false
    }

    async getPurchaseHistory() {
        const conn = await pool.getConnection()
        if (conn) {
            try {
                const [results] = await conn.query('SELECT * FROM PurchaseHistory ORDER BY pk DESC')
                return results
            } catch (e) {
                console.log(e)
            } finally {
                conn.release()
            }
        }
    }

    async getPurchaseDetail(ids) {
        const res = []
        const conn = await pool.getConnection()
        if (conn) {
            try {
                for (let id of ids) {
                    // SELECT m.name, pd.cnt FROM `JUMAK-KIOSK`.PurchaseHistory ph INNER JOIN `JUMAK-KIOSK`.PurchaseDetail pd ON ph.id = pd.purchaseid INNER JOIN `JUMAK-KIOSK`.Menu m ON pd.menuid = m.id ORDER BY m.prio;
                    const [results] = await conn.query('SELECT m.name, pd.cnt FROM PurchaseHistory ph INNER JOIN PurchaseDetail pd ON ph.id = pd.purchaseid INNER JOIN Menu m ON pd.menuid = m.id WHERE ph.id = ? ORDER BY m.prio', [id])
                    res.push(results)
                }
            } catch (e) {
                res.length = 0
                console.log(e)
            } finally {
                conn.release()
            }
        }
        return res
    }

    async requestPurchase(pInfo) {
        const conn = await pool.getConnection()
        if (conn) {
            const purchaseUUID = uuidv4().replace(/-/g, '').substring(0, 16)
            try {
                await conn.beginTransaction()
                await conn.query('INSERT INTO PurchaseHistory (id, sessionuid, entrytime, exittime, amount, tablenum) VALUES (?, ?, ?, CONVERT_TZ(NOW(), \'+00:00\', \'+09:00\'), ?, ?)', [purchaseUUID, pInfo.sessionid, new Date(pInfo.entrytime), pInfo.amount + pInfo.fee, pInfo.tablenum])
                
                for (const value of pInfo.menu) {
                    await conn.query('INSERT INTO PurchaseDetail (purchaseid, menuid, cnt) VALUES (?, ?, ?)', [purchaseUUID, value.id, value.cnt])
                }

                await conn.query('DELETE FROM Session WHERE id = ?', [pInfo.sessionid])
                
                await conn.commit()
                return true
            } catch (e) {
                console.log(e)
                await conn.rollback()
            } finally {
                conn.release()
            }
        }
        return false
    }

    async getMenu() {
        let res
        const conn = await pool.getConnection()
        try {
            const [results] = await conn.query('SELECT id, name, price FROM Menu ORDER BY prio')
            res = results
        } catch (e) {
            res = null
        }
        conn.release()
        return res
    }

    async getOrderStatus(uid) {
        let res = { success: false }
        const conn = await pool.getConnection()
        if (conn) {
            try {
                const [results] = await conn.query('SELECT status FROM `Order` WHERE id = ?', [uid])
                res = results
            } catch (e) {
                res = null
            } finally {
                conn.release()
            }
        }
        return res
    }

    async getOrderStatusV2(uid, muid) {
        let res = { success: false }
        const conn = await pool.getConnection()
        if (conn) {
            try {
                const [results] = await conn.query('SELECT status FROM OrderDetail WHERE orderuid = ? AND menuuid = ?', [uid, muid])
                res = results
            } catch (e) {
                res = null
            } finally {
                conn.release()
            }
        }
        return res
    }

    ADD_MENU_NAME_ERROR = 'add_menu_name_error'

    async addMenu(name, price) {
        let checkName = false
        let checkSize = false
        let result = { success: false }
        const uuid = uuidv4().replace(/-/g, '').substring(0, 16)
        const conn = await pool.getConnection()
        try {
            const [size] = await conn.query('SELECT COUNT(name) AS cnt FROM Menu WHERE `name` = ?', [name])
            if (size[0].cnt == 0) checkName = true
        } catch (e) {

        }
        try {
            const [size] = await conn.query('SELECT COUNT(id) AS cnt FROM Menu WHERE `id` = ?', [uuid])
            if (size[0].cnt == 0) checkSize = true
        } catch (e) {

        }
        if (checkName && checkSize) {
            try {
                const [results] = await conn.query('INSERT INTO Menu (id, name, price) VALUES (?, ?, ?)', [uuid, name, price])
                result.success = true
            } catch (e) {
                result.success = false
                result.reason = e.toString()
            }
        } else {
            if (!checkName) {
                result.reason = '중복된 메뉴입니다'
            } else {
                result.reason = 'UID가 중복됩니다, 추가 버튼을 다시 눌러주세요'
            }
        }
        conn.release()
        return result
    }
}

module.exports = { DBHelper }