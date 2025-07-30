// Script de prueba para verificar pujas activas
// Ejecutar en el navegador en la consola de desarrollador

async function testMyBids() {
  try {
    // Obtener token del localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.token) {
      console.error('No hay usuario autenticado');
      return;
    }

    // Obtener league_id del contexto
    const leagueId = document.querySelector('[data-league-id]')?.dataset.leagueId || '1';
    
    console.log('Testing my bids for league:', leagueId);
    console.log('User token:', user.token.substring(0, 20) + '...');

    // Llamar al endpoint de my-bids
    const response = await fetch(`/api/my-bids?league_id=${leagueId}`, {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });

    const data = await response.json();
    console.log('My bids response:', data);
    console.log('Number of bids:', data.bids?.length || 0);

    // Analizar cada bid
    if (data.bids && data.bids.length > 0) {
      data.bids.forEach((bid, index) => {
        console.log(`Bid ${index + 1}:`, {
          id: bid.id,
          type: bid.type,
          name: bid.name,
          driver_name: bid.driver_name,
          team: bid.team,
          my_bid: bid.my_bid,
          is_auction: bid.is_auction,
          owner_id: bid.owner_id,
          value: bid.value
        });
      });
    } else {
      console.log('No bids found');
    }

    // Probar eliminar una oferta si existe
    if (data.bids && data.bids.length > 0) {
      const firstBid = data.bids[0];
      console.log('Testing delete offer for:', firstBid);
      
      const deleteResponse = await fetch(`/api/${firstBid.type}/delete-offer`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          item_id: firstBid.id,
          league_id: leagueId
        })
      });

      const deleteData = await deleteResponse.json();
      console.log('Delete offer response:', deleteData);
    }

  } catch (error) {
    console.error('Error testing my bids:', error);
  }
}

// Función para probar el endpoint de eliminar ofertas
async function testDeleteOffer(itemType, itemId, leagueId) {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.token) {
      console.error('No hay usuario autenticado');
      return;
    }

    console.log(`Testing delete offer for ${itemType} ID ${itemId} in league ${leagueId}`);

    const response = await fetch(`/api/${itemType}/delete-offer`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({
        item_id: itemId,
        league_id: leagueId
      })
    });

    const data = await response.json();
    console.log('Delete offer response:', data);
    console.log('Response status:', response.status);

  } catch (error) {
    console.error('Error testing delete offer:', error);
  }
}

// Función para verificar el tipo de elemento
function testGetItemType(item) {
  console.log('Testing getItemType for:', item);
  
  // Simular la función getItemType del frontend
  const getItemType = (item) => {
    if (item.type) return item.type;
    
    if (item.driver_name && !item.track_engineer_id && !item.chief_engineer_id && !item.team_constructor_id) {
      return 'pilot';
    }
    if (item.track_engineer_id) return 'track_engineer';
    if (item.chief_engineer_id) return 'chief_engineer';
    if (item.team_constructor_id) return 'team_constructor';
    
    return item.type || 'pilot';
  };

  const result = getItemType(item);
  console.log('Determined type:', result);
  return result;
}

// Exportar funciones para uso en consola
window.testMyBids = testMyBids;
window.testDeleteOffer = testDeleteOffer;
window.testGetItemType = testGetItemType;

console.log('Test functions loaded. Use:');
console.log('- testMyBids() to test fetching my bids');
console.log('- testDeleteOffer(itemType, itemId, leagueId) to test deleting an offer');
console.log('- testGetItemType(item) to test type determination'); 