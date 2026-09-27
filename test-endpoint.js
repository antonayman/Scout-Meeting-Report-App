const url =
  "https://script.google.com/macros/s/AKfycbwr5AJ8h10trAuqCIkj0g-a3IaU79s-7GpCuu3ExdCFIYnW2Es2mHA-89fw50f7B37Dtw/exec"

async function test() {
  try {
    const res = await fetch(url + "?action=ping")
    const text = await res.text()
    console.log("GET response:", res.status, text)

    const payload = {
      meetingDate: "2023-10-10",
      location: "test",
      sector: "test",
      startTime: "10:00",
      endTime: "11:00",
      attendees: 10,
      absentees: 0,
      signature: "",
      activities: [
        {
          meetingContent: "test",
          field: "test",
          duration: "test",
          toolsUsed: "test",
          personResponsible: "test",
          notes: "test",
        },
      ],
    }

    const res2 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
    const text2 = await res2.text()
    console.log("POST response:", res2.status, text2)
  } catch (err) {
    console.error("Error:", err)
  }
}

test()
