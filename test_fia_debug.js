// Script de debug para verificar ofertas de la FIA
const debugFIAOffers = async () => {
  console.log('🔍 Iniciando debug de ofertas de la FIA...');
  
  try {
    // 1. Verificar usuario admin
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.token) {
      console.error('❌ No hay token de usuario');
      return;
    }
    
    console.log('✅ Usuario autenticado:', user.name);
    console.log('🔑 Token:', user.token.substring(0, 20) + '...');
    
    // 2. Verificar si es admin
    const adminCheck = await fetch('/api/players/' + user.id, {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });
    
    if (adminCheck.ok) {
      const adminData = await adminCheck.json();
      console.log('👤 Datos del usuario:', adminData.player);
      console.log('🔐 Es admin:', adminData.player.is_admin);
    }
    
    // 3. Obtener liga seleccionada
    const selectedLeague = JSON.parse(localStorage.getItem('selectedLeague'));
    if (!selectedLeague?.id) {
      console.error('❌ No hay liga seleccionada');
      return;
    }
    
    console.log('🏆 Liga seleccionada:', selectedLeague.name, '(ID:', selectedLeague.id + ')');
    
    // 4. Verificar elementos en venta
    console.log('\n📊 Verificando elementos en venta...');
    
    const salesResponse = await fetch(`/api/my-market-sales?league_id=${selectedLeague.id}`, {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });
    
    if (salesResponse.ok) {
      const salesData = await salesResponse.json();
      console.log('📦 Elementos en venta:', salesData.sales?.length || 0);
      
      if (salesData.sales && salesData.sales.length > 0) {
        console.log('📋 Detalles de elementos en venta:');
        salesData.sales.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.name} - Precio: ${item.venta}€ - FIA: ${item.league_offer_value || 'Sin oferta'}`);
        });
      } else {
        console.log('⚠️ No hay elementos en venta');
      }
    } else {
      console.error('❌ Error obteniendo ventas:', salesResponse.status);
    }
    
    // 5. Probar generar ofertas de la FIA
    console.log('\n🔄 Probando generar ofertas de la FIA...');
    
    const fiaResponse = await fetch(`/api/generate-fia-offers?league_id=${selectedLeague.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (fiaResponse.ok) {
      const fiaData = await fiaResponse.json();
      console.log('✅ Respuesta generar ofertas FIA:', fiaData);
      
      // 6. Verificar si se generaron ofertas
      console.log('\n🔍 Verificando si se generaron ofertas...');
      
      const checkResponse = await fetch(`/api/my-market-sales?league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        console.log('📊 Elementos con ofertas FIA después de generar:');
        
        if (checkData.sales && checkData.sales.length > 0) {
          checkData.sales.forEach((item, index) => {
            if (item.league_offer_value) {
              console.log(`  ✅ ${item.name} - Oferta FIA: ${item.league_offer_value}€`);
            }
          });
        } else {
          console.log('⚠️ No se encontraron ofertas de la FIA');
        }
      }
      
    } else {
      const errorData = await fiaResponse.json();
      console.error('❌ Error generando ofertas FIA:', errorData);
    }
    
    // 7. Verificar logs del servidor
    console.log('\n📝 Revisa los logs del servidor para ver:');
    console.log('  - [FIA] Generando ofertas de la FIA para liga X');
    console.log('  - [FIA] Oferta FIA generada para piloto X: Y€');
    console.log('  - [FIA-OFFERS] Ofertas de la FIA generadas correctamente');
    
  } catch (err) {
    console.error('💥 Error en debug:', err);
  }
};

// Ejecutar el debug
debugFIAOffers(); 