// Script de prueba para verificar el endpoint del ingeniero
// Ejecutar en la consola del navegador

async function testEngineerEndpoint() {
  console.log('=== TESTING ENGINEER ENDPOINT ===');
  
  // Parámetros de prueba
  const engineerId = 59;
  const leagueId = 39;
  const type = 'chief';
  
  console.log(`Testing ${type} engineer ID: ${engineerId}, League: ${leagueId}`);
  
  try {
    // 1. Probar el endpoint del ingeniero
    console.log('\n1. Testing engineer endpoint...');
    const engineerEndpoint = `/api/chiefengineersbyleague?id=${engineerId}&league_id=${leagueId}`;
    console.log('Endpoint:', engineerEndpoint);
    
    const engineerResponse = await fetch(engineerEndpoint);
    console.log('Response status:', engineerResponse.status);
    
    if (!engineerResponse.ok) {
      console.error('Engineer endpoint failed:', engineerResponse.status, engineerResponse.statusText);
      return;
    }
    
    const engineerData = await engineerResponse.json();
    console.log('Engineer data:', engineerData);
    
    // 2. Verificar estructura de datos
    console.log('\n2. Checking data structure...');
    console.log('Has chief_engineer:', !!engineerData.chief_engineer);
    console.log('Has engineer:', !!engineerData.engineer);
    console.log('Has pilots:', !!engineerData.pilots);
    
    if (engineerData.chief_engineer) {
      console.log('Chief engineer data:', engineerData.chief_engineer);
    }
    
    // 3. Probar el endpoint de subasta
    console.log('\n3. Testing auction endpoint...');
    const auctionEndpoint = `/api/auctions/by-item?item_type=chief_engineer&item_id=${engineerId}&league_id=${leagueId}`;
    console.log('Auction endpoint:', auctionEndpoint);
    
    const auctionResponse = await fetch(auctionEndpoint);
    console.log('Auction response status:', auctionResponse.status);
    
    if (auctionResponse.ok) {
      const auctionData = await auctionResponse.json();
      console.log('Auction data:', auctionData);
    } else {
      console.log('No active auction found (this is normal if no auction exists)');
    }
    
    // 4. Probar el endpoint de player by league
    console.log('\n4. Testing player by league endpoint...');
    const playerId = localStorage.getItem('player_id');
    if (playerId) {
      const playerEndpoint = `/api/playerbyleague?player_id=${playerId}&league_id=${leagueId}`;
      console.log('Player endpoint:', playerEndpoint);
      
      const playerResponse = await fetch(playerEndpoint);
      console.log('Player response status:', playerResponse.status);
      
      if (playerResponse.ok) {
        const playerData = await playerResponse.json();
        console.log('Player data:', playerData);
      }
    }
    
    console.log('\n=== TEST COMPLETED ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Ejecutar la prueba
testEngineerEndpoint(); 