const url =
  "https://script.google.com/macros/s/AKfycbwr5AJ8h10trAuqCIkj0g-a3IaU79s-7GpCuu3ExdCFIYnW2Es2mHA-89fw50f7B37Dtw/exec"

async function testInvalid() {
  try {
    const payload = {} // empty payload

    const res2 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
    const text2 = await res2.text()
    console.log("POST invalid response:", res2.status, text2)
  } catch (err) {
    console.error("Error:", err)
  }
}

testInvalid()
