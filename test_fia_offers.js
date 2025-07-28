// Script de prueba para verificar ofertas de la FIA
const testFIAOffers = async () => {
  console.log('🧪 Iniciando prueba de ofertas de la FIA...');
  
  try {
    // 1. Verificar que el usuario es admin
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.token) {
      console.error('❌ No hay token de usuario');
      return;
    }
    
    console.log('✅ Usuario autenticado:', user.name);
    
    // 2. Obtener la liga seleccionada
    const selectedLeague = JSON.parse(localStorage.getItem('selectedLeague'));
    if (!selectedLeague?.id) {
      console.error('❌ No hay liga seleccionada');
      return;
    }
    
    console.log('✅ Liga seleccionada:', selectedLeague.name);
    
    // 3. Probar generar ofertas de la FIA
    console.log('🔄 Probando generar ofertas de la FIA...');
    const fiaResponse = await fetch(`/api/generate-fia-offers?league_id=${selectedLeague.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      }
    });
    
    const fiaData = await fiaResponse.json();
    console.log('📊 Respuesta generar ofertas FIA:', fiaData);
    
    if (fiaResponse.ok) {
      console.log('✅ Ofertas de la FIA generadas correctamente');
    } else {
      console.error('❌ Error generando ofertas de la FIA:', fiaData.error);
      return;
    }
    
    // 4. Verificar elementos en venta
    console.log('🔄 Verificando elementos en venta...');
    const salesResponse = await fetch(`/api/my-market-sales?league_id=${selectedLeague.id}`, {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });
    
    const salesData = await salesResponse.json();
    console.log('📊 Elementos en venta:', salesData);
    
    // 5. Verificar ofertas recibidas
    console.log('🔄 Verificando ofertas recibidas...');
    const offersResponse = await fetch(`/api/player/received-offers?league_id=${selectedLeague.id}`, {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });
    
    const offersData = await offersResponse.json();
    console.log('📊 Ofertas recibidas:', offersData);
    
    // 6. Analizar resultados
    let totalFIAOffers = 0;
    let totalPlayerOffers = 0;
    
    // Contar ofertas de la FIA en elementos en venta
    if (salesData.sales) {
      salesData.sales.forEach(sale => {
        if (sale.league_offer_value) {
          totalFIAOffers++;
          console.log(`💰 Oferta FIA encontrada para ${sale.name || sale.driver_name}: ${sale.league_offer_value}€`);
        }
      });
    }
    
    // Contar ofertas de jugadores
    if (offersData.offers) {
      totalPlayerOffers = offersData.offers.length;
      offersData.offers.forEach(offer => {
        console.log(`👤 Oferta de jugador encontrada para ${offer.name}: ${offer.offer_value}€ (${offer.bidder_name})`);
      });
    }
    
    console.log('📈 RESUMEN:');
    console.log(`   - Ofertas de la FIA: ${totalFIAOffers}`);
    console.log(`   - Ofertas de jugadores: ${totalPlayerOffers}`);
    console.log(`   - Total de ofertas: ${totalFIAOffers + totalPlayerOffers}`);
    
    if (totalFIAOffers > 0) {
      console.log('✅ Las ofertas de la FIA están funcionando correctamente');
    } else {
      console.log('⚠️ No se encontraron ofertas de la FIA. Esto puede ser normal si no hay elementos en venta.');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
};

// Ejecutar la prueba
testFIAOffers(); 