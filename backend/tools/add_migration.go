package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func main() {
	fmt.Println("=== Agregar Nueva Migración ===")

	// Obtener el siguiente ID de migración
	nextID := getNextMigrationID()

	fmt.Printf("ID de migración: %d\n", nextID)

	// Obtener nombre de la migración
	fmt.Print("Nombre de la migración (ej: Add new column): ")
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Scan()
	name := strings.TrimSpace(scanner.Text())

	if name == "" {
		fmt.Println("Error: El nombre no puede estar vacío")
		return
	}

	// Obtener SQL de la migración
	fmt.Println("SQL de la migración (termina con 'END' en una línea separada):")
	var sqlLines []string
	for {
		scanner.Scan()
		line := scanner.Text()
		if line == "END" {
			break
		}
		sqlLines = append(sqlLines, line)
	}

	sql := strings.Join(sqlLines, "\n")
	if sql == "" {
		fmt.Println("Error: El SQL no puede estar vacío")
		return
	}

	// Generar el código Go
	goCode := fmt.Sprintf(`	{
		ID:   %d,
		Name: "%s",
		SQL: `+"`%s`"+`,
	},`, nextID, name, sql)

	fmt.Println("\n=== Código Go generado ===")
	fmt.Println("Agrega esto a MigrationsList en backend/migrations/migrations.go:")
	fmt.Println()
	fmt.Println(goCode)
	fmt.Println()

	// Guardar en archivo
	filename := fmt.Sprintf("migration_%d_%s.sql", nextID, strings.ReplaceAll(strings.ToLower(name), " ", "_"))
	err := os.WriteFile(filename, []byte(sql), 0644)
	if err != nil {
		fmt.Printf("Error guardando archivo: %v\n", err)
		return
	}

	fmt.Printf("SQL guardado en: %s\n", filename)
}

func getNextMigrationID() int {
	// Leer el archivo de migraciones para obtener el siguiente ID
	content, err := os.ReadFile("../migrations/migrations.go")
	if err != nil {
		fmt.Printf("Error leyendo archivo de migraciones: %v\n", err)
		return 1
	}

	lines := strings.Split(string(content), "\n")
	maxID := 0

	for _, line := range lines {
		if strings.Contains(line, "ID:") && strings.Contains(line, ",") {
			// Extraer el ID de la línea
			parts := strings.Split(line, "ID:")
			if len(parts) > 1 {
				idPart := strings.Split(parts[1], ",")[0]
				idPart = strings.TrimSpace(idPart)
				if id, err := strconv.Atoi(idPart); err == nil && id > maxID {
					maxID = id
				}
			}
		}
	}

	return maxID + 1
}
