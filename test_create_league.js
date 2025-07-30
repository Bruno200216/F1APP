// Script para probar la creación de ligas
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testCreateLeague() {
    try {
        // Primero hacer login para obtener el token
        const loginResponse = await axios.post(`${API_BASE_URL}/login`, {
            email: 'test@example.com',
            password: 'password123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login exitoso, token obtenido');

        // Crear una liga
        const createLeagueResponse = await axios.post(`${API_BASE_URL}/leagues`, {
            name: 'Liga de Prueba',
            code: 'TEST123'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Liga creada exitosamente:', createLeagueResponse.data);
        
        // Obtener las ligas para verificar
        const leaguesResponse = await axios.get(`${API_BASE_URL}/leagues`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('📋 Ligas disponibles:', leaguesResponse.data);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.status === 500) {
            console.error('Error del servidor:', error.response.data);
        }
    }
}

testCreateLeague(); 