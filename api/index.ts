import express from 'express';
import bodyParser from "body-parser";
import cors from 'cors';

import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DB_ACCESS
});

// comando de query do banco de dados
export const query = async (text: string, params: any[] = []) => {
    const start = Date.now();
    const client = await pool.connect();
    try {
        const res = await client.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query:', { text, duration, rows: res.rowCount });
        return res;
    } finally {
        client.release();
    }
}

const server = express();

// Libs
server.use(express.json());
server.use(cors());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());


server.get('/', (req, res) => {
    console.log('GET /');
    res.status(200).send('Hello World');
});

server.post('/api/v1/users', async (req, res) => {
    console.log('POST /api/v1/users');
    console.log(req.headers);

    if (req.body.temperature && req.body.humidity && req.body.carbonMonoxide) {
        const { temperature, humidity, carbonMonoxide } = req.body;
        console.log('Temperature:', temperature);
        console.log('Humidity:', humidity);
        console.log('Carbon Monoxide:', carbonMonoxide);

        // Inserir dados na tabela 'data'
        try {
            await query('INSERT INTO data (temperature, humidity, carbonmonoxide, data) VALUES ($1, $2, $3, $4)', [temperature, humidity, carbonMonoxide, new Date()]);
            await query('DELETE FROM lastupdate');
            await query('INSERT INTO lastupdate (temperature, humidity, carbonmonoxide, data) VALUES ($1, $2, $3, $4)', [temperature, humidity, carbonMonoxide, new Date()]);

            res.status(200).send('Ok!');
        } catch (error) {
            console.error('Error inserting data:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.status(400).send('Bad request');
        console.log('Bad request');
    }
});

server.get('/api/v1/users', async (req, res) => {
    console.log('GET /api/v1/users');
    console.log(req.headers);

    try {
        const result = await query('SELECT * FROM lastupdate');
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching last update:', error);
        res.status(500).send('Internal Server Error');
    }
});

server.listen(3000, async () => {
    try {
        await query('CREATE TABLE IF NOT EXISTS data (temperature FLOAT, humidity FLOAT, carbonmonoxide FLOAT, data TIMESTAMP)');
        await query('CREATE TABLE IF NOT EXISTS lastupdate (temperature FLOAT, humidity FLOAT, carbonmonoxide FLOAT, data TIMESTAMP)');
    } catch (error) {
        console.error('Error creating tables:', error);
    }

    console.log('Server is running on http://localhost:3000');
});

export default server;
