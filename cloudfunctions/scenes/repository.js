const REST_BASE =
  "https://wenwu-331122-d6gyrwmum2a734671.api.tcloudbasegateway.com/v1/rdb/rest";

async function selectRows(pathWithQuery, key) {
  const resp = await fetch(REST_BASE + pathWithQuery, {
    headers: { Authorization: "Bearer " + key }
  });
  if (!resp.ok) {
    throw new Error("upstream_status_" + resp.status);
  }
  return resp.json();
}

async function patchRows(pathWithQuery, body, key) {
  const resp = await fetch(REST_BASE + pathWithQuery, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    throw new Error("upstream_status_" + resp.status);
  }
  return resp.json();
}

function listScenes(key) {
  return selectRows("/scenes?select=*&order=no.asc", key);
}

function findScene(id, key) {
  return selectRows("/scenes?id=eq." + id + "&select=*", key);
}

function listStepsOfScene(id, key) {
  return selectRows(
    "/steps?select=order_no,content,difficulty_level,time_minutes,caution,measure_status&scene_id=eq." +
      id +
      "&order=order_no.asc",
    key
  );
}

function listResources(key) {
  return selectRows(
    "/resources?select=id,name,url,purpose,kind&order=id.asc",
    key
  );
}

function listInstruments(queryString, key) {
  return selectRows("/instruments?" + queryString, key);
}

function listTasks(key) {
  return selectRows("/tasks?select=id,label,scene_id&order=id.asc", key);
}

function findStep(sceneId, orderNo, key) {
  return selectRows(
    "/steps?scene_id=eq." +
      sceneId +
      "&order_no=eq." +
      orderNo +
      "&select=scene_id,order_no,difficulty_level,time_minutes,measure_status",
    key
  );
}

function markStepMeasured(sceneId, orderNo, level, minutes, key) {
  return patchRows(
    "/steps?scene_id=eq." + sceneId + "&order_no=eq." + orderNo,
    {
      difficulty_level: level,
      time_minutes: minutes,
      measure_status: "measured"
    },
    key
  );
}

module.exports = {
  selectRows: selectRows,
  patchRows: patchRows,
  listScenes: listScenes,
  findScene: findScene,
  listStepsOfScene: listStepsOfScene,
  listResources: listResources,
  listInstruments: listInstruments,
  listTasks: listTasks,
  findStep: findStep,
  markStepMeasured: markStepMeasured
};
